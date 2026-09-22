import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Execute contest state, ranked teams, and active questions count in parallel
    const [contestRes, teamsRes, questionsRes] = await Promise.all([
      query("SELECT status, duration_seconds, end_time FROM contest_state WHERE id = 1"),
      query(`
        SELECT 
          t.id,
          t.name,
          t.score,
          t.last_submission_at,
          t.created_at,
          COALESCE(s.solves_count, 0) as solves_count
        FROM teams t
        LEFT JOIN (
          SELECT team_id, COUNT(*) as solves_count
          FROM submissions
          WHERE is_correct = TRUE
          GROUP BY team_id
        ) s ON t.id = s.team_id
        ORDER BY t.score DESC, t.last_submission_at ASC NULLS LAST, t.id ASC
      `),
      query("SELECT COUNT(*) FROM questions WHERE is_active = TRUE"),
    ]);

    const contest = contestRes.rows[0];
    const now = new Date();
    let status = contest?.status || "PENDING";
    let timeRemainingSeconds = contest?.duration_seconds || 2700;

    if (status === "RUNNING") {
      if (contest?.end_time) {
        const diffMs = new Date(contest.end_time).getTime() - now.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec <= 0) {
          status = "ENDED";
          timeRemainingSeconds = 0;
          await query("UPDATE contest_state SET status = 'ENDED', updated_at = NOW() WHERE id = 1");
        } else {
          timeRemainingSeconds = diffSec;
        }
      }
    } else if (status === "ENDED") {
      timeRemainingSeconds = 0;
    }

    const rankedTeams = teamsRes.rows.map((t, idx) => ({
      rank: idx + 1,
      id: t.id,
      name: t.name,
      score: Number(t.score),
      solvesCount: Number(t.solves_count),
      lastSubmissionAt: t.last_submission_at,
      createdAt: t.created_at,
    }));

    const totalTeams = rankedTeams.length;
    const totalSolves = rankedTeams.reduce((sum, t) => sum + t.solvesCount, 0);
    const totalChallenges = Number(questionsRes.rows[0]?.count || 0);

    const topThree = rankedTeams.slice(0, 3);

    return NextResponse.json({
      status,
      timeRemainingSeconds,
      durationSeconds: contest?.duration_seconds || 2700,
      teams: rankedTeams,
      topThree,
      stats: {
        totalTeams,
        totalSolves,
        totalChallenges,
      },
    });
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load leaderboard." },
      { status: 500 }
    );
  }
}
