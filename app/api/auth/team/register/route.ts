import { NextResponse, NextRequest } from "next/server";
import { query } from "@/lib/db";
import { createTeamToken } from "@/lib/auth";
import crypto from "crypto";

function generateTeamCode(): string {
  const randomChars = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `RW-${randomChars}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body?.name?.trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Team name must be at least 2 characters long." },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: "Team name must be 50 characters or fewer." },
        { status: 400 }
      );
    }

    // Check duplicate team name (case-insensitive)
    const existing = await query(
      "SELECT id, name FROM teams WHERE LOWER(name) = LOWER($1)",
      [name]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `The team name "${name}" is already taken. Please choose a different name.` },
        { status: 409 }
      );
    }

    // Generate unique code
    let code = generateTeamCode();
    let collision = await query("SELECT id FROM teams WHERE code = $1", [code]);
    let attempts = 0;
    while (collision.rows.length > 0 && attempts < 5) {
      code = generateTeamCode();
      collision = await query("SELECT id FROM teams WHERE code = $1", [code]);
      attempts++;
    }

    // Insert new team
    const insertRes = await query(
      "INSERT INTO teams (name, code, score) VALUES ($1, $2, 0) RETURNING id, name, code, score, created_at",
      [name, code]
    );
    const newTeam = insertRes.rows[0];

    // Create session token
    const token = await createTeamToken({
      teamId: newTeam.id,
      teamName: newTeam.name,
      teamCode: newTeam.code,
    });

    const response = NextResponse.json({
      success: true,
      message: "Team registered successfully!",
      team: newTeam,
    });

    response.cookies.set("rewired_team_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Team registration error:", error);
    return NextResponse.json(
      { error: "Failed to register team. Please try again." },
      { status: 500 }
    );
  }
}
