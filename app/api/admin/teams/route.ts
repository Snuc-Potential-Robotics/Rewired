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
        COUNT(CASE WHEN s.is_correct = TRUE THEN 1 END) as solves_count
      FROM teams t
      LEFT JOIN submissions s ON t.id = s.team_id
      GROUP BY t.id
      ORDER BY t.score DESC, t.name ASC
    `);

    return NextResponse.json({ teams: res.rows });
  } catch (error) {
    console.error("Admin teams error:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}
