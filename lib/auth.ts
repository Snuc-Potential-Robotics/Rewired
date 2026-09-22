import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET || "rewired_super_secret_jwt_key_2026_snuc_robotics_ctf";
const encodedKey = new TextEncoder().encode(secretKey);

export interface TeamSession {
  teamId: number;
  teamName: string;
  teamCode: string;
}

export interface AdminSession {
  email: string;
  role: "admin";
}

export async function createTeamToken(payload: TeamSession): Promise<string> {
  return new SignJWT({ ...payload, role: "team" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(encodedKey);
}

export async function verifyTeamToken(token: string): Promise<TeamSession | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey);
    if (payload.role !== "team") return null;
    return {
      teamId: payload.teamId as number,
      teamName: payload.teamName as string,
      teamCode: payload.teamCode as string,
    };
  } catch {
    return null;
  }
}

export async function createAdminToken(payload: AdminSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(encodedKey);
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey);
    if (payload.role !== "admin") return null;
    return {
      email: payload.email as string,
      role: "admin",
    };
  } catch {
    return null;
  }
}

export async function getTeamSession(): Promise<TeamSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("rewired_team_token")?.value;
  if (!token) return null;
  return verifyTeamToken(token);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("rewired_admin_token")?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
