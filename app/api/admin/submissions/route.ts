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
        s.id,
        s.team_id,
        t.name as team_name,
        s.question_id,
        q.title as question_title,
        s.submitted_flag,
        s.is_correct,
        s.points_awarded,
        s.created_at
      FROM submissions s
      JOIN teams t ON s.team_id = t.id
      JOIN questions q ON s.question_id = q.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({ submissions: res.rows });
  } catch (error) {
    console.error("Admin submissions error:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
