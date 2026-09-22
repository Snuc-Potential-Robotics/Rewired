import { NextResponse, NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getTeamSession } from "@/lib/auth";
import { checkSubmissionRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const team = await getTeamSession();
    if (!team) {
      return NextResponse.json(
        { error: "Authentication required. Please register or sign in with your team code." },
        { status: 401 }
      );
    }

    // 1. Rate limiting check (strict per-team cooldown)
    const rateCheck = checkSubmissionRateLimit(team.teamId, 4);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Cooldown active. Please wait ${rateCheck.retryAfterSeconds} seconds before submitting again.`,
          retryAfter: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // 2. Check contest state
    const contestRes = await query("SELECT * FROM contest_state WHERE id = 1");
    const contest = contestRes.rows[0];

    if (!contest || contest.status !== "RUNNING") {
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
        { error: "The contest has ended! No further submissions can be made." },
        { status: 403 }
      );
    }

    // Check if end_time has passed
    if (contest.end_time && new Date(contest.end_time).getTime() <= Date.now()) {
      await query("UPDATE contest_state SET status = 'ENDED', updated_at = NOW() WHERE id = 1");
      return NextResponse.json(
        { error: "Time is up! The 30-minute competition has officially ended." },
        { status: 403 }
      );
    }

    // 3. Parse and validate input
    const body = await req.json();
    const questionId = Number(body?.questionId);
    const flag = body?.flag?.trim();

    if (!questionId || !flag) {
      return NextResponse.json(
        { error: "Question ID and flag answer are required." },
        { status: 400 }
      );
    }

    // 4. Check if already solved
    const alreadySolved = await query(
      "SELECT id FROM submissions WHERE team_id = $1 AND question_id = $2 AND is_correct = TRUE",
      [team.teamId, questionId]
    );

    if (alreadySolved.rows.length > 0) {
      return NextResponse.json(
        { error: "Challenge already solved! This answer is locked and cannot be re-submitted." },
        { status: 400 }
      );
    }

    // 5. Fetch question details
    const qRes = await query("SELECT * FROM questions WHERE id = $1 AND is_active = TRUE", [
      questionId,
    ]);

    if (qRes.rows.length === 0) {
      return NextResponse.json({ error: "Challenge not found or inactive." }, { status: 404 });
    }

    const question = qRes.rows[0];
    const isCorrect = question.flag.trim().toLowerCase() === flag.toLowerCase();

    if (isCorrect) {
      // Award points & record correct submission
      await query(
        `INSERT INTO submissions (team_id, question_id, submitted_flag, is_correct, points_awarded)
         VALUES ($1, $2, $3, TRUE, $4)
         ON CONFLICT DO NOTHING`,
        [team.teamId, questionId, flag, question.points]
      );

      const updateTeamRes = await query(
        `UPDATE teams 
         SET score = score + $1,
             last_submission_at = NOW()
         WHERE id = $2
         RETURNING score`,
        [question.points, team.teamId]
      );

      const newScore = updateTeamRes.rows[0]?.score ?? 0;

      return NextResponse.json({
        success: true,
        isCorrect: true,
        message: `Correct flag captured! +${question.points} points awarded.`,
        pointsAwarded: question.points,
        newScore,
      });
    } else {
      // Record failed attempt
      await query(
        `INSERT INTO submissions (team_id, question_id, submitted_flag, is_correct, points_awarded)
         VALUES ($1, $2, $3, FALSE, 0)`,
        [team.teamId, questionId, flag]
      );

      return NextResponse.json({
        success: false,
        isCorrect: false,
        error: "Incorrect flag! Review the challenge details and try again.",
      });
    }
  } catch (error) {
    console.error("Submission processing error:", error);
    return NextResponse.json(
      { error: "Internal error processing submission. Please try again." },
      { status: 500 }
    );
  }
}
