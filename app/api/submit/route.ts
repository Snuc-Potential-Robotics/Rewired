import { NextResponse, NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { getTeamSession } from "@/lib/auth";
import { checkSubmissionRateLimit } from "@/lib/rate-limit";
import { calculateDynamicPoints } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  const team = await getTeamSession();
  if (!team) {
    return NextResponse.json(
      { error: "Authentication required. Please register or sign in with your team code." },
      { status: 401 }
    );
  }

  // Parse and validate input
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const questionId = typeof body?.questionId === "number" ? body.questionId : Number(body?.questionId);
  const flag = typeof body?.flag === "string" ? body.flag.trim() : null;

  if (!questionId || !flag || isNaN(questionId)) {
    return NextResponse.json(
      { error: "Question ID and flag answer are required." },
      { status: 400 }
    );
  }

  // Check rate limit before acquiring a transaction client to prevent connection pool exhaustion / deadlock
  const rateCheck = await checkSubmissionRateLimit(team.teamId, 4);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: `Cooldown active. Please wait ${rateCheck.retryAfterSeconds} seconds before submitting again.`,
        retryAfter: rateCheck.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Lock contest state row for share to atomically verify deadline & status
    const contestRes = await client.query(
      "SELECT status, duration_seconds, start_time, end_time FROM contest_state WHERE id = 1 FOR SHARE"
    );
    const contest = contestRes.rows[0];

    if (!contest || contest.status !== "RUNNING") {
      await client.query("ROLLBACK");
      if (contest?.status === "PENDING") {
        return NextResponse.json(
          { error: "The CTF has not started yet. Awaiting admin signal." },
          { status: 403 }
        );
      }
      if (contest?.status === "PAUSED") {
        return NextResponse.json(
          { error: "The CTF is currently paused by administrators." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "The competition has officially ended." },
        { status: 403 }
      );
    }

    // 2. Atomically check and enforce deadline
    if (contest.end_time && new Date(contest.end_time).getTime() <= Date.now()) {
      await client.query(
        "UPDATE contest_state SET status = 'ENDED', updated_at = NOW() WHERE id = 1"
      );
      await client.query("COMMIT");
      return NextResponse.json(
        { error: "Time is up! The competition has officially ended." },
        { status: 403 }
      );
    }

    // 4. Fetch question details with row lock to serialize concurrent solves on the same question
    const qRes = await client.query(
      "SELECT id, flag, points FROM questions WHERE id = $1 AND is_active = TRUE FOR UPDATE",
      [questionId]
    );

    if (qRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Challenge not found or inactive." }, { status: 404 });
    }

    const question = qRes.rows[0];

    // 5. Check if already solved by this team
    const alreadySolved = await client.query(
      "SELECT id FROM submissions WHERE team_id = $1 AND question_id = $2 AND is_correct = TRUE FOR UPDATE",
      [team.teamId, questionId]
    );

    if (alreadySolved.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Challenge already solved! This answer is locked and cannot be re-submitted." },
        { status: 400 }
      );
    }

    const isCorrect = question.flag.trim().toLowerCase() === flag.toLowerCase();

    if (isCorrect) {
      // Count prior correct solves to determine dynamic solve rank
      const priorSolvesRes = await client.query<{ count: string }>(
        "SELECT COUNT(*)::INT AS count FROM submissions WHERE question_id = $1 AND is_correct = TRUE",
        [questionId]
      );
      const solveRank = (Number(priorSolvesRes.rows[0]?.count) || 0) + 1;

      // Compute time remaining on contest clock for Kahoot-style speed bonus
      const nowMs = Date.now();
      const endMs = contest.end_time ? new Date(contest.end_time).getTime() : nowMs;
      const timeRemainingSeconds = Math.max(0, Math.floor((endMs - nowMs) / 1000));
      const totalDurationSeconds = contest.duration_seconds || 2700;

      const scoring = calculateDynamicPoints(
        question.points,
        solveRank,
        timeRemainingSeconds,
        totalDurationSeconds
      );
      const pointsAwarded = scoring.awardedPoints;

      // 6. Atomic insert: only update score if this insert actually created the winning record
      const insertRes = await client.query(
        `INSERT INTO submissions (team_id, question_id, submitted_flag, is_correct, points_awarded)
         VALUES ($1, $2, $3, TRUE, $4)
         ON CONFLICT (team_id, question_id) WHERE is_correct = TRUE DO NOTHING
         RETURNING id`,
        [team.teamId, questionId, flag, pointsAwarded]
      );

      if (insertRes.rows.length === 0) {
        // Race condition: another concurrent submission completed first
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Challenge already solved! This answer is locked." },
          { status: 400 }
        );
      }

      // 7. Update team score inside the exact same transaction
      const updateTeamRes = await client.query(
        `UPDATE teams 
         SET score = score + $1,
             last_submission_at = NOW()
         WHERE id = $2
         RETURNING score`,
        [pointsAwarded, team.teamId]
      );

      await client.query("COMMIT");

      const newScore = updateTeamRes.rows[0]?.score ?? 0;

      let message = `Correct flag captured! +${pointsAwarded} Coins awarded.`;
      if (scoring.isFirstBlood) {
        message = `🎉 FIRST BLOOD! You were the 1st team to capture this flag! +${pointsAwarded} Coins awarded.`;
      } else if (scoring.solveRank === 2) {
        message = `⚡ 2nd Solve! Fast capture bonus applied! +${pointsAwarded} Coins awarded.`;
      } else if (scoring.solveRank === 3) {
        message = `🥉 3rd Solve! Fast capture bonus applied! +${pointsAwarded} Coins awarded.`;
      } else {
        message = `Correct flag captured! (Solve #${scoring.solveRank}) +${pointsAwarded} Coins awarded.`;
      }

      return NextResponse.json({
        success: true,
        isCorrect: true,
        message,
        pointsAwarded,
        solveRank: scoring.solveRank,
        isFirstBlood: scoring.isFirstBlood,
        newScore,
      });
    } else {
      // Record failed attempt
      await client.query(
        `INSERT INTO submissions (team_id, question_id, submitted_flag, is_correct, points_awarded)
         VALUES ($1, $2, $3, FALSE, 0)`,
        [team.teamId, questionId, flag]
      );
      await client.query("COMMIT");

      return NextResponse.json({
        success: false,
        isCorrect: false,
        error: "Incorrect flag! Review the challenge details and try again.",
      });
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Submission processing error:", error);
    return NextResponse.json(
      { error: "Internal error processing submission. Please try again." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
