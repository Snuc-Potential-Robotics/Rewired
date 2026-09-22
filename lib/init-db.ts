import { query } from "./db";
import bcrypt from "bcryptjs";

export async function initDatabase() {
  try {
    // 1. Contest State table
    await query(`
      CREATE TABLE IF NOT EXISTS contest_state (
        id INT PRIMARY KEY DEFAULT 1,
        title VARCHAR(100) NOT NULL DEFAULT 'Rewired CTF 2026',
        duration_seconds INT NOT NULL DEFAULT 1800,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        start_time TIMESTAMPTZ,
        end_time TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT single_contest CHECK (id = 1)
      );
    `);

    // Ensure contest state row 1 exists
    const contestRow = await query("SELECT * FROM contest_state WHERE id = 1");
    if (contestRow.rows.length === 0) {
      await query(`
        INSERT INTO contest_state (id, title, duration_seconds, status)
        VALUES (1, 'Rewired CTF 2026', 1800, 'PENDING')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 2. Teams table
    await query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(20) NOT NULL UNIQUE,
        score INT NOT NULL DEFAULT 0,
        last_submission_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
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

    // Seed default admin: robotics@snuchennai.edu.in / password@123
    const adminCheck = await query("SELECT * FROM admins WHERE email = $1", [
      "robotics@snuchennai.edu.in",
    ]);
    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash("password@123", 10);
      await query(
        "INSERT INTO admins (email, password_hash) VALUES ($1, $2)",
        ["robotics@snuchennai.edu.in", hash]
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
      CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
    `);

    return { success: true };
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

/**
 * Completely purges all questions, teams, and submissions for a fresh contest launch.
 */
export async function clearAllContestData() {
  await query("DELETE FROM submissions");
  await query("DELETE FROM questions");
  await query("DELETE FROM teams");
  await query(
    `UPDATE contest_state 
     SET status = 'PENDING',
         duration_seconds = 1800,
         start_time = NULL,
         end_time = NULL,
         updated_at = NOW()
     WHERE id = 1`
  );
  return { success: true };
}
