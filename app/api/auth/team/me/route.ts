import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * Session probe. "Nobody is signed in" is a valid answer, not a failure, so
 * this always answers 200 with `authenticated: false` rather than 401 — a 401
 * here made the browser console log a red error on every poll for every
 * signed-out visitor.
 */
export async function GET() {
  try {
    const session = await getTeamSession();
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    const res = await query(
      "SELECT id, name, code, score, last_submission_at, created_at FROM teams WHERE id = $1",
      [session.teamId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ authenticated: false });
    }

    const solvedRes = await query(
      "SELECT question_id FROM submissions WHERE team_id = $1 AND is_correct = TRUE",
      [session.teamId]
    );
    const solvedIds = solvedRes.rows.map((r) => r.question_id);

    return NextResponse.json({
      authenticated: true,
      team: {
        ...res.rows[0],
        solvedQuestionIds: solvedIds,
      },
    });
  } catch (error) {
    console.error("Team session check failed:", error);
    return NextResponse.json(
      { authenticated: false, error: "Could not read the team session." },
      { status: 500 }
    );
  }
}
