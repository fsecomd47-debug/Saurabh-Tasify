import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { onboardingProfiles, profiles, sessions, users } from "@/db/schema";
import { generateToken } from "@/lib/auth/password";

export const SESSION_COOKIE = "st_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type SessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
};

/**
 * Creates a server-side session row and returns the opaque token.
 * Only the SHA-256 of the token is stored; the raw value lives solely
 * in an HTTP-only cookie — never exposed to client JS (spec §13/§44).
 */
export async function createSession(userId: string): Promise<string> {
  const { token, tokenHash } = generateToken(32);
  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  // Opportunistic cleanup of this user's dead sessions.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  return token;
}

export function attachSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}

/** Reads + validates the session cookie. Returns null when absent/expired. */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return getSessionByToken(raw);
}

export async function getSessionByToken(token: string): Promise<SessionUser | null> {
  const { sha256 } = await import("@/lib/auth/password");
  const rows = await db
    .select({
      sessionId: sessions.id,
      lastUsedAt: sessions.lastUsedAt,
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Sliding activity touch (throttled to once per hour to avoid write amplification).
  if (Date.now() - new Date(row.lastUsedAt).getTime() > 60 * 60 * 1000) {
    await db.update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, row.sessionId));
  }

  return { id: row.id, email: row.email, emailVerified: !!row.emailVerifiedAt };
}

export class UnauthenticatedError extends Error {}

/** Session or throw — for API routes. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new UnauthenticatedError("Authentication required.");
  return user;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return;
  const { sha256 } = await import("@/lib/auth/password");
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(raw)));
}

/* ── Full identity (session + profile) for server components ───── */

export type AuthedContext = {
  user: SessionUser;
  profile: { displayName: string; avatarId: string; timezone: string };
  onboardingComplete: boolean;
};

export async function getAuthContext(): Promise<AuthedContext | null> {
  const user = await getSession();
  if (!user) return null;

  const rows = await db
    .select({
      displayName: profiles.displayName,
      avatarId: profiles.avatarId,
      timezone: profiles.timezone,
      onboardingCompleted: onboardingProfiles.completed,
    })
    .from(profiles)
    .leftJoin(onboardingProfiles, eq(onboardingProfiles.userId, profiles.userId))
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return { user, profile: { displayName: "", avatarId: "", timezone: "UTC" }, onboardingComplete: false };
  }
  return {
    user,
    profile: { displayName: row.displayName, avatarId: row.avatarId, timezone: row.timezone },
    onboardingComplete: !!row.onboardingCompleted,
  };
}
