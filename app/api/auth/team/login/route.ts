import { NextResponse, NextRequest } from "next/server";
import { query } from "@/lib/db";
import { createTeamToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body?.name?.trim();
    const code = body?.code?.trim()?.toUpperCase();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Please provide both your Team Name and Unique Access Code." },
        { status: 400 }
      );
    }

    const result = await query(
      "SELECT id, name, code, score, created_at FROM teams WHERE LOWER(name) = LOWER($1) AND UPPER(code) = UPPER($2)",
      [name, code]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials. Team name and access code do not match." },
        { status: 401 }
      );
    }

    const team = result.rows[0];

    const token = await createTeamToken({
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
    });

    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully!",
      team,
    });

    response.cookies.set("rewired_team_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Team login error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
