import { cookies } from "next/headers";
import { sha256 } from "@/lib/auth/password";

const SESSION_COOKIE = "st-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function hashToken(token: string): string {
  return sha256(token);
}
