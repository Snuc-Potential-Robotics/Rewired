import { NextResponse, NextRequest } from "next/server";
import { query, pool } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

const DEFAULT_DURATION_SECONDS = 2700; // 45 minutes

export async function GET() {
  try {
    const res = await query("SELECT * FROM contest_state WHERE id = 1");
    if (res.rows.length === 0) {
      return NextResponse.json({
        status: "PENDING",
        duration_seconds: DEFAULT_DURATION_SECONDS,
        time_remaining_seconds: DEFAULT_DURATION_SECONDS,
      });
    }

    const contest = res.rows[0];
    const now = new Date();
    let status = contest.status;
    let timeRemainingSeconds = contest.duration_seconds;

    if (status === "RUNNING") {
      if (contest.end_time) {
        const diffMs = new Date(contest.end_time).getTime() - now.getTime();
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec <= 0) {
          // Timer naturally elapsed! Auto-end contest
          status = "ENDED";
          timeRemainingSeconds = 0;
          await query(
            "UPDATE contest_state SET status = 'ENDED', updated_at = NOW() WHERE id = 1"
          );
        } else {
          timeRemainingSeconds = diffSec;
        }
      }
    } else if (status === "ENDED") {
      timeRemainingSeconds = 0;
    } else if (status === "PAUSED") {
      timeRemainingSeconds = contest.duration_seconds;
    }

    return NextResponse.json({
      title: contest.title,
      status,
      duration_seconds: contest.duration_seconds,
      time_remaining_seconds: timeRemainingSeconds,
      start_time: contest.start_time,
      end_time: contest.end_time,
      server_time: now.toISOString(),
    });
  } catch (error) {
    console.error("Contest get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest state" },
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
    const action = body?.action; // 'start' | 'pause' | 'resume' | 'extend' | 'end' | 'reset'

    const currentRes = await query("SELECT * FROM contest_state WHERE id = 1");
    const current = currentRes.rows[0];

    if (action === "start") {
      const rawMinutes = body?.durationMinutes !== undefined ? Number(body.durationMinutes) : 45;
      const durationMinutes = isNaN(rawMinutes) ? 45 : Math.max(1, Math.min(240, rawMinutes));
      const duration = durationMinutes * 60;
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 1000);
      await query(
        `UPDATE contest_state 
         SET status = 'RUNNING',
             duration_seconds = $1,
             start_time = $2,
             end_time = $3,
             updated_at = NOW()
         WHERE id = 1`,
        [duration, startTime, endTime]
      );
      return NextResponse.json({
        success: true,
        message: `CTF started! Timer running for ${durationMinutes} minutes.`,
      });
    }

    if (action === "pause") {
      let remaining = 0;
      if (current.end_time) {
        remaining = Math.max(0, Math.floor((new Date(current.end_time).getTime() - Date.now()) / 1000));
      }
      await query(
        `UPDATE contest_state 
         SET status = 'PAUSED',
             duration_seconds = $1,
             updated_at = NOW()
         WHERE id = 1`,
        [remaining]
      );
      return NextResponse.json({ success: true, message: "CTF paused." });
    }

    if (action === "resume") {
      const remaining = current.duration_seconds ?? DEFAULT_DURATION_SECONDS;
      if (remaining <= 0) {
        await query(
          `UPDATE contest_state SET status = 'ENDED', updated_at = NOW() WHERE id = 1`
        );
        return NextResponse.json({ success: true, message: "Contest time has already elapsed." });
      }
      const endTime = new Date(Date.now() + remaining * 1000);
      await query(
        `UPDATE contest_state 
         SET status = 'RUNNING',
             end_time = $1,
             updated_at = NOW()
         WHERE id = 1`,
        [endTime]
      );
      return NextResponse.json({ success: true, message: "CTF resumed." });
    }

    if (action === "extend") {
      const rawMinutes = body?.minutes !== undefined ? Number(body.minutes) : 5;
      const extendMinutes = isNaN(rawMinutes) ? 5 : Math.max(1, Math.min(120, rawMinutes));

      if (current.status === "PAUSED") {
        // Paused contest: extend the stored remaining seconds without losing the paused time
        const newRemaining = (current.duration_seconds ?? 0) + extendMinutes * 60;
        await query(
          `UPDATE contest_state 
           SET duration_seconds = $1,
               updated_at = NOW()
           WHERE id = 1`,
          [newRemaining]
        );
        return NextResponse.json({
          success: true,
          message: `Extended paused CTF by ${extendMinutes} minutes. Remaining: ${Math.round(newRemaining / 60)} mins.`,
        });
      }

      // Running or Ended contest: compute end_time extending from the current end_time or now
      const baseTime = current.end_time && current.status === "RUNNING"
        ? Math.max(new Date(current.end_time).getTime(), Date.now())
        : Date.now();
      const newEndTime = new Date(baseTime + extendMinutes * 60 * 1000);
      await query(
        `UPDATE contest_state 
         SET status = 'RUNNING',
             end_time = $1,
             updated_at = NOW()
         WHERE id = 1`,
        [newEndTime]
      );
      return NextResponse.json({ success: true, message: `Extended CTF by ${extendMinutes} minutes.` });
    }

    if (action === "end") {
      await query(
        `UPDATE contest_state 
         SET status = 'ENDED',
             end_time = NOW(),
             duration_seconds = 0,
             updated_at = NOW()
         WHERE id = 1`
      );
      return NextResponse.json({ success: true, message: "CTF ended successfully." });
    }

    if (action === "reset") {
      const clearSubmissions = body?.clearSubmissions === true;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE contest_state 
           SET status = 'PENDING',
               duration_seconds = $1,
               start_time = NULL,
               end_time = NULL,
               updated_at = NOW()
           WHERE id = 1`,
          [DEFAULT_DURATION_SECONDS]
        );

        if (clearSubmissions) {
          await client.query("DELETE FROM submissions");
          await client.query("UPDATE teams SET score = 0, last_submission_at = NULL");
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }

      return NextResponse.json({
        success: true,
        message: clearSubmissions
          ? "Contest reset to PENDING and team submissions cleared."
          : "Contest state reset to PENDING.",
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error) {
    console.error("Contest action error:", error);
    return NextResponse.json(
      { error: "Failed to process contest action." },
      { status: 500 }
    );
  }
}
