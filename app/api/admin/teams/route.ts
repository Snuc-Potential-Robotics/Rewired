import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const res = await query(`
      SELECT 
        t.id,
        t.name,
        t.code,
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
      ORDER BY t.score DESC, t.name ASC
    `);

    return NextResponse.json({ teams: res.rows });
  } catch (error) {
    console.error("Admin teams error:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}
