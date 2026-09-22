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

    // Seed default sample challenges if empty
    const qCount = await query("SELECT COUNT(*) FROM questions");
    if (parseInt(qCount.rows[0].count, 10) === 0) {
      const sampleQuestions = [
        {
          title: "Microcontroller Pulse",
          category: "Hardware",
          points: 100,
          description:
            "A robotic servo actuator operates on a standard 50Hz PWM signal. The telemetry logs indicate that at maximum deflection the pulse width measured 2500 microseconds. The internal calibrated lookup specifies: deflection angle = 180 degrees. Enter the decoded flag.",
          flag: "flag{pwm_servo_angle_180}",
          hint: "The flag format is flag{pwm_servo_angle_180}",
          order_index: 1,
        },
        {
          title: "Robo-Admin Auth Header",
          category: "Web",
          points: 150,
          description:
            "The Autonomous Rover API endpoint rejected unauthorized access with error code 403. Analyzing the firmware reveal an undocumented HTTP request header: `X-Robotics-Access: override_root`. What flag is exposed when using this bypass?",
          flag: "flag{x_robotics_auth_bypass}",
          hint: "Inspect the custom header value in the challenge prompt.",
          order_index: 2,
        },
        {
          title: "Rotated Servo Shift",
          category: "Cryptography",
          points: 100,
          description:
            "An encoded message was retrieved from a robot arm sensor buffer: `iodj{fdhvdu_flskhu_urerw_dup}`. It was encrypted with a standard Caesar shift of 3 positions. Decipher the transmission.",
          flag: "flag{caesar_cipher_robot_arm}",
          hint: "Shift each alphabetical character backwards by 3 (D -> A, E -> B, etc.).",
          order_index: 3,
        },
        {
          title: "Firmware Bitmask",
          category: "Reverse",
          points: 200,
          description:
            "A drone autopilot subsystem verifies commands with an XOR parity mask. Given the hexadecimal payload `0x58 0x4f 0x52 0x5f 0x39 0x39` representing the internal sub-key `xor_bitwise_override_99`, enter the flag wrapped in standard format.",
          flag: "flag{xor_bitwise_override_99}",
          hint: "Wrap the decoded sub-key in flag{...}",
          order_index: 4,
        },
        {
          title: "CAN Bus Telemetry Leak",
          category: "Forensics",
          points: 250,
          description:
            "During an autonomous rover lap, diagnostic packets were sniffed on the high-speed CAN bus at standard baud rate 500k. The broadcast frame ID `0x7DF` triggered an engine telemetry dump labeled `diagnostic`. Submit the flag.",
          flag: "flag{can_id_0x7df_diagnostic}",
          hint: "Look at the standard OBD-II broadcast request CAN ID: 0x7DF.",
          order_index: 5,
        },
        {
          title: "Breadboard Logic Paradox",
          category: "Misc",
          points: 150,
          description:
            "An engineer wired an active-low pullup circuit incorrectly, connecting VCC straight to ground through a 0-ohm jumper resistor. The smoke test reported: `breadboard_short_circuit`. Submit the incident flag.",
          flag: "flag{breadboard_short_circuit}",
          hint: "The answer format is flag{...} matching the incident code.",
          order_index: 6,
        },
      ];

      for (const q of sampleQuestions) {
        await query(
          `INSERT INTO questions (title, category, points, description, flag, hint, order_index, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
          [q.title, q.category, q.points, q.description, q.flag, q.hint, q.order_index]
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}
