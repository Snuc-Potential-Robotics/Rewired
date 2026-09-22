import { NextResponse, NextRequest } from "next/server";
import { query } from "@/lib/db";
import { createAdminToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please provide both admin email and password." },
        { status: 400 }
      );
    }

    // Direct check for specified hardcoded credentials or database lookup
    const targetEmail = "robotics@snuchennai.edu.in";
    const targetPass = "password@123";

    if (email === targetEmail && password === targetPass) {
      const token = await createAdminToken({
        email: targetEmail,
        role: "admin",
      });

      const response = NextResponse.json({
        success: true,
        message: "Admin authenticated successfully.",
      });

      response.cookies.set("rewired_admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });

      return response;
    }

    // Fallback DB check if admin account was updated
    const adminRes = await query("SELECT * FROM admins WHERE email = $1", [email]);
    if (adminRes.rows.length > 0) {
      const admin = adminRes.rows[0];
      const match = await bcrypt.compare(password, admin.password_hash);
      if (match) {
        const token = await createAdminToken({
          email: admin.email,
          role: "admin",
        });

        const response = NextResponse.json({
          success: true,
          message: "Admin authenticated successfully.",
        });

        response.cookies.set("rewired_admin_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24,
          path: "/",
        });

        return response;
      }
    }

    return NextResponse.json(
      { error: "Invalid admin credentials. Access denied." },
      { status: 401 }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Internal server error during authentication." },
      { status: 500 }
    );
  }
}
