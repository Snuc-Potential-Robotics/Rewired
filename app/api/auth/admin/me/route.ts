import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

/** Session probe — see the note on the team equivalent for why this is 200. */
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({
      authenticated: true,
      admin: {
        email: session.email,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Admin session check failed:", error);
    return NextResponse.json(
      { authenticated: false, error: "Could not read the admin session." },
      { status: 500 }
    );
  }
}
