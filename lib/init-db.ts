import { query } from "./db";
import bcrypt from "bcryptjs";

export async function initDatabase() {
  try {
    // 1. Contest State table (Default 45 minutes = 2700 seconds)
    await query(`
      CREATE TABLE IF NOT EXISTS contest_state (
        id INT PRIMARY KEY DEFAULT 1,
        title VARCHAR(100) NOT NULL DEFAULT 'Rewired CTF 2026',
        duration_seconds INT NOT NULL DEFAULT 2700,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        start_time TIMESTAMPTZ,
        end_time TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT single_contest CHECK (id = 1)
      );
      ALTER TABLE contest_state ALTER COLUMN duration_seconds SET DEFAULT 2700;
    `);

    // Ensure contest state row 1 exists and migrate legacy 1800s default if still pending
    const contestRow = await query("SELECT * FROM contest_state WHERE id = 1");
    if (contestRow.rows.length === 0) {
      await query(`
        INSERT INTO contest_state (id, title, duration_seconds, status)
        VALUES (1, 'Rewired CTF 2026', 2700, 'PENDING')
        ON CONFLICT (id) DO NOTHING;
      `);
    } else {
      await query(`
        UPDATE contest_state 
        SET duration_seconds = 2700, updated_at = NOW() 
        WHERE id = 1 AND duration_seconds = 1800 AND status = 'PENDING';
      `);
    }

    // 2. Teams table with case-insensitive unique index
    await query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL UNIQUE,
        score INT NOT NULL DEFAULT 0,
        last_submission_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Reconcile existing case-insensitive duplicate team names before creating unique index
    await query(`
      UPDATE teams t
      SET name = t.name || '_' || t.id
      WHERE t.id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY score DESC, created_at ASC) as rnum
          FROM teams
        ) ranked WHERE ranked.rnum > 1
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_lower_name ON teams (LOWER(name));
      CREATE INDEX IF NOT EXISTS idx_teams_score ON teams(score DESC, last_submission_at ASC);
    `);

    // 3. Admins table
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(120) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed admin from environment
    const adminEmail = (process.env.ADMIN_EMAIL || "robotics@snuchennai.edu.in").trim().toLowerCase();
    const adminCheck = await query("SELECT id FROM admins WHERE LOWER(email) = LOWER($1)", [
      adminEmail,
    ]);
    if (adminCheck.rows.length === 0) {
      const plainPassword = process.env.ADMIN_PASSWORD;
      if (!plainPassword) {
        throw new Error(
          "ADMIN_PASSWORD environment variable is required to initialize the admin account. Please set ADMIN_PASSWORD in your environment."
        );
      }
      const hash = await bcrypt.hash(plainPassword, 10);
      await query(
        "INSERT INTO admins (email, password_hash) VALUES ($1, $2)",
        [adminEmail, hash]
      );
    }

    // 4. Questions table
    await query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        category VARCHAR(60) NOT NULL,
        points INT NOT NULL DEFAULT 100,
        description TEXT NOT NULL,
        flag VARCHAR(255) NOT NULL,
        hint TEXT,
        order_index INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_questions_active_order ON questions(is_active, order_index, id);
    `);

    // 5. Submissions table
    await query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        submitted_flag VARCHAR(255) NOT NULL,
        is_correct BOOLEAN NOT NULL,
        points_awarded INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_team_question_correct 
      ON submissions (team_id, question_id) 
      WHERE is_correct = TRUE;
      CREATE INDEX IF NOT EXISTS idx_submissions_question_correct 
      ON submissions (question_id) 
      WHERE is_correct = TRUE;
      CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON submissions(team_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
    `);

    // 6. Distributed Rate Limits table for multi-instance deployments
    await query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key VARCHAR(255) PRIMARY KEY,
        last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        attempt_count INT NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limits_last_attempt ON rate_limits(last_attempt_at);
    `);

    return { success: true };
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

/**
 * Purges questions, teams, and submissions for a fresh contest launch.
 */
export async function clearAllContestData() {
  await query("DELETE FROM submissions");
  await query("DELETE FROM questions");
  await query("DELETE FROM teams");
  await query("DELETE FROM rate_limits");
  await query(
    `UPDATE contest_state 
     SET status = 'PENDING',
         duration_seconds = 2700,
         start_time = NULL,
         end_time = NULL,
         updated_at = NOW()
     WHERE id = 1`
  );
  return { success: true };
}
