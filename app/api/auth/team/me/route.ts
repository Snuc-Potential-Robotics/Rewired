import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await getTeamSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const res = await query(
      "SELECT id, name, code, score, last_submission_at, created_at FROM teams WHERE id = $1",
      [session.teamId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Get solved question IDs for this team
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
    console.error("Auth me error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
