import { NextResponse, NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getAdminSession, getTeamSession } from "@/lib/auth";
import { calculateDynamicPoints } from "@/lib/scoring";

export async function GET() {
  try {
    const admin = await getAdminSession();
    const team = await getTeamSession();

    // Check contest state
    const contestRes = await query("SELECT status, duration_seconds, end_time FROM contest_state WHERE id = 1");
    const contestRow = contestRes.rows[0];
    const contestStatus = contestRow?.status || "PENDING";
    const nowMs = Date.now();
    const endMs = contestRow?.end_time ? new Date(contestRow.end_time).getTime() : nowMs;
    const timeRemainingSeconds = Math.max(0, Math.floor((endMs - nowMs) / 1000));
    const totalDurationSeconds = contestRow?.duration_seconds || 2700;

    if (admin) {
      // Admin sees everything, including real flags and solve statistics
      const qRes = await query(`
        SELECT 
          q.id,
          q.title,
          q.category,
          q.points,
          q.description,
          q.flag,
          q.hint,
          q.order_index,
          q.is_active,
          q.created_at,
          COUNT(CASE WHEN s.is_correct = TRUE THEN 1 END) as solves_count,
          COUNT(s.id) as total_attempts
        FROM questions q
        LEFT JOIN submissions s ON q.id = s.question_id
        GROUP BY q.id
        ORDER BY q.order_index ASC, q.id ASC
      `);

      return NextResponse.json({
        questions: qRes.rows,
        isAdmin: true,
      });
    }

    // Non-admin contestant view
    if (contestStatus === "PENDING") {
      // Contest has not started yet!
      // Return teaser metadata with redacted text to prevent DevTools cheating
      const qRes = await query(`
        SELECT id, category, points, order_index
        FROM questions
        WHERE is_active = TRUE
        ORDER BY order_index ASC, id ASC
      `);

      const blurredTeasers = qRes.rows.map((q, idx) => ({
        id: q.id,
        title: `Challenge #${idx + 1} [LOCKED]`,
        category: q.category,
        points: q.points,
        current_points: q.points,
        isFirstBloodAvailable: true,
        description: "Challenge payload encrypted. Decryption key will be dispatched upon event launch.",
        hint: null,
        order_index: q.order_index,
        isSolved: false,
        isLocked: true,
      }));

      return NextResponse.json({
        questions: blurredTeasers,
        contestStatus,
        isLocked: true,
      });
    }

    // Contest is RUNNING or ENDED: Fetch active questions and team solves in parallel
    const [qRes, solvedRes] = await Promise.all([
      query(`
        SELECT 
          q.id,
          q.title,
          q.category,
          q.points,
          q.description,
          q.hint,
          q.order_index,
          COALESCE(sc.solves_count, 0) as solves_count
        FROM questions q
        LEFT JOIN (
          SELECT question_id, COUNT(*) as solves_count
          FROM submissions
          WHERE is_correct = TRUE
          GROUP BY question_id
        ) sc ON q.id = sc.question_id
        WHERE q.is_active = TRUE
        ORDER BY q.order_index ASC, q.id ASC
      `),
      team
        ? query<{ question_id: number }>(
            "SELECT question_id FROM submissions WHERE team_id = $1 AND is_correct = TRUE",
            [team.teamId]
          )
        : Promise.resolve({ rows: [] }),
    ]);

    const solvedSet = new Set<number>(solvedRes.rows.map((r) => r.question_id));

    const sanitizedQuestions = qRes.rows.map((q) => {
      const solvesCount = Number(q.solves_count || 0);
      const nextSolveRank = solvesCount + 1;
      const dynamic = calculateDynamicPoints(
        q.points,
        nextSolveRank,
        timeRemainingSeconds,
        totalDurationSeconds
      );

      return {
        ...q,
        solves_count: solvesCount,
        current_points: dynamic.awardedPoints,
        isFirstBloodAvailable: nextSolveRank === 1,
        isSolved: solvedSet.has(q.id),
        isLocked: false,
      };
    });

    return NextResponse.json({
      questions: sanitizedQuestions,
      contestStatus,
      isLocked: false,
    });
  } catch (error) {
    console.error("Questions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const body = await req.json();
    const { title, category, points, description, flag, hint, order_index } = body;

    if (!title || !category || !points || !description || !flag) {
      return NextResponse.json(
        { error: "Please provide title, category, points, description, and flag." },
        { status: 400 }
      );
    }

    const numPoints = Number(points);
    if (isNaN(numPoints) || numPoints <= 0 || numPoints > 10000) {
      return NextResponse.json(
        { error: "Points must be a positive number between 1 and 10,000." },
        { status: 400 }
      );
    }

    const res = await query(
      `INSERT INTO questions (title, category, points, description, flag, hint, order_index, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING *`,
      [
        title.trim(),
        category.trim(),
        numPoints,
        description.trim(),
        flag.trim(),
        hint ? hint.trim() : null,
        order_index ? Number(order_index) : 0,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Challenge added successfully!",
      question: res.rows[0],
    });
  } catch (error) {
    console.error("Create question error:", error);
    return NextResponse.json({ error: "Failed to create challenge." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, category, points, description, flag, hint, order_index, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing challenge ID." }, { status: 400 });
    }

    let numPoints: number | null = null;
    if (points !== undefined) {
      numPoints = Number(points);
      if (isNaN(numPoints) || numPoints <= 0 || numPoints > 10000) {
        return NextResponse.json(
          { error: "Points must be a positive number between 1 and 10,000." },
          { status: 400 }
        );
      }
    }

    // Support explicitly clearing hint by passing empty string or null
    const hintProvided = hint !== undefined;
    const cleanHint = hint && typeof hint === "string" && hint.trim().length > 0 ? hint.trim() : null;

    const res = await query(
      `UPDATE questions
       SET title = COALESCE($1, title),
           category = COALESCE($2, category),
           points = COALESCE($3, points),
           description = COALESCE($4, description),
           flag = COALESCE($5, flag),
           hint = CASE WHEN $6 = TRUE THEN $7 ELSE hint END,
           order_index = COALESCE($8, order_index),
           is_active = COALESCE($9, is_active)
       WHERE id = $10
       RETURNING *`,
      [
        title?.trim() || null,
        category?.trim() || null,
        numPoints,
        description?.trim() || null,
        flag?.trim() || null,
        hintProvided,
        cleanHint,
        order_index !== undefined ? Number(order_index) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        Number(id),
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Challenge updated successfully!",
      question: res.rows[0],
    });
  } catch (error) {
    console.error("Update question error:", error);
    return NextResponse.json({ error: "Failed to update challenge." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Challenge ID required." }, { status: 400 });
    }

    await query("DELETE FROM questions WHERE id = $1", [Number(id)]);

    return NextResponse.json({
      success: true,
      message: "Challenge deleted successfully.",
    });
  } catch (error) {
    console.error("Delete question error:", error);
    return NextResponse.json({ error: "Failed to delete challenge." }, { status: 500 });
  }
}
