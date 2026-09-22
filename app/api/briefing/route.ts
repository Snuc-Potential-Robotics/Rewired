import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { BRIEFING } from "@/lib/briefing";

/**
 * Serves the operation briefing, but only once the contest is out of PENDING.
 * The briefing names the attack surface, so releasing it early would hand
 * teams a head start — same rule `/api/questions` applies to challenge text.
 */
export async function GET() {
  try {
    const admin = await getAdminSession();

    const contestRes = await query("SELECT status FROM contest_state WHERE id = 1");
    const status = contestRes.rows[0]?.status || "PENDING";

    if (status === "PENDING" && !admin) {
      return NextResponse.json({ sealed: true, briefing: null });
    }

    return NextResponse.json({ sealed: false, briefing: BRIEFING });
  } catch (error) {
    console.error("Briefing fetch failed:", error);
    return NextResponse.json(
      { sealed: true, briefing: null, error: "Could not load the briefing." },
      { status: 500 }
    );
  }
}
