import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  role?: "viewer" | "owner";
  expiresAt?: string;
}

const SESSION_OPTIONS = {
  password:
    process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long!!",
  cookieName: "restaurant-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

export async function getRole(): Promise<"viewer" | "owner" | null> {
  const session = await getSession();
  if (!session.role) return null;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    session.destroy();
    return null;
  }
  return session.role;
}
