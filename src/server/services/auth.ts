import { eq, and, gt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashPassword, verifyPassword, generateToken } from "@/lib/auth/password";
import { setSessionCookie, clearSessionCookie, hashToken } from "@/server/lib/session";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/server/services/email";
import { NextRequest } from "next/server";

/* ───────────────────── Error Codes ───────────────────── */

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMAIL_EXISTS"
  | "EMAIL_NOT_FOUND"
  | "EMAIL_NOT_VERIFIED"
  | "EMAIL_ALREADY_VERIFIED"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_FAILURE"
  | "SESSION_EXPIRED"
  | "UNKNOWN_ERROR";

export type AuthResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: { code: AuthErrorCode; message: string };
};

/* ───────────────────── Validation ───────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | null {
  if (!email || !EMAIL_RE.test(email)) return "Invalid email address";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password is too long";
  return null;
}

function validateDisplayName(name: string): string | null {
  if (!name || name.trim().length < 2) return "Name must be at least 2 characters";
  if (name.trim().length > 50) return "Name must be at most 50 characters";
  return null;
}

/* ───────────────────── Register ───────────────────── */

export async function register(
  req: NextRequest,
  input: { email: string; password: string; displayName: string }
): Promise<AuthResult<{ userId: string; email: string }>> {
  const ip = clientIp(req);

  // Rate limit: 5 registrations per IP per 15 minutes
  const rl = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return { success: false, error: { code: "RATE_LIMITED", message: `Too many attempts. Try again in ${rl.retryAfterSec}s.` } };
  }

  // Validate
  const emailErr = validateEmail(input.email);
  if (emailErr) return { success: false, error: { code: "VALIDATION_ERROR", message: emailErr } };

  const pwErr = validatePassword(input.password);
  if (pwErr) return { success: false, error: { code: "VALIDATION_ERROR", message: pwErr } };

  const nameErr = validateDisplayName(input.displayName);
  if (nameErr) return { success: false, error: { code: "VALIDATION_ERROR", message: nameErr } };

  const normalizedEmail = input.email.trim().toLowerCase();

  // Check existing user
  const existing = await db.query.users.findFirst({
    where: eq(sql`lower(${schema.users.email})`, normalizedEmail),
  });

  if (existing) {
    // Neutral response to prevent enumeration (§46)
    return { success: false, error: { code: "EMAIL_EXISTS", message: "An account with this email already exists." } };
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user + profile in a transaction
  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(schema.users)
      .values({ email: normalizedEmail, passwordHash })
      .returning({ id: schema.users.id, email: schema.users.email });

    await tx.insert(schema.profiles).values({
      userId: user.id,
      displayName: input.displayName.trim(),
    });

    return user;
  });

  // Generate email verification token
  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(schema.authTokens).values({
    userId: result.id,
    type: "email_verify",
    tokenHash,
    expiresAt,
  });

  // Send verification email (fire-and-forget — don't block registration)
  sendVerificationEmail(normalizedEmail, token).catch((err) => {
    console.error("[auth/register] Failed to send verification email:", err);
  });

  return { success: true, data: { userId: result.id, email: normalizedEmail } };
}

/* ───────────────────── Login ───────────────────── */

export async function login(
  req: NextRequest,
  input: { email: string; password: string }
): Promise<AuthResult<{ userId: string; emailVerified: boolean }>> {
  const ip = clientIp(req);

  // Rate limit: 10 login attempts per IP per 15 minutes
  const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return { success: false, error: { code: "RATE_LIMITED", message: `Too many attempts. Try again in ${rl.retryAfterSec}s.` } };
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(sql`lower(${schema.users.email})`, normalizedEmail),
  });

  // Always run verifyPassword to prevent timing attacks
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : false;

  if (!valid || !user) {
    return { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } };
  }

  // Create session
  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(schema.sessions).values({
    userId: user.id,
    tokenHash,
    userAgent: req.headers.get("user-agent") || undefined,
    expiresAt,
  });

  // Set cookie
  await setSessionCookie(token);

  // Log successful login
  await db.insert(schema.activityEvents).values({
    userId: user.id,
    type: "LOGIN",
    metadata: { ip },
  });

  return {
    success: true,
    data: {
      userId: user.id as string,
      emailVerified: user.emailVerifiedAt !== null,
    },
  };
}

/* ───────────────────── Logout ───────────────────── */

export async function logout(req: NextRequest): Promise<AuthResult> {
  const tokenHash = await getAndHashCurrentToken();
  if (!tokenHash) {
    await clearSessionCookie();
    return { success: true };
  }

  // Delete the session
  await db
    .delete(schema.sessions)
    .where(eq(schema.sessions.tokenHash, tokenHash));

  await clearSessionCookie();
  return { success: true };
}

/* ───────────────────── Get Current User ───────────────────── */

export async function getCurrentUser() {
  const tokenHash = await getAndHashCurrentToken();
  if (!tokenHash) return null;

  const session = await db.query.sessions.findFirst({
    where: and(
      eq(schema.sessions.tokenHash, tokenHash),
      gt(schema.sessions.expiresAt, new Date())
    ),
    with: {
      // Drizzle doesn't auto-join, we'll query separately
    },
  });

  if (!session) return null;

  // Update lastUsedAt
  await db
    .update(schema.sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.sessions.id, session.id));

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.userId),
    columns: { passwordHash: false },
  });

  if (!user) return null;

  // Get profile
  const profile = await db.query.profiles.findFirst({
    where: eq(schema.profiles.userId, user.id),
  });

  // Get onboarding status
  const onboarding = await db.query.onboardingProfiles.findFirst({
    where: eq(schema.onboardingProfiles.userId, user.id),
  });

  return {
    user,
    profile,
    onboardingCompleted: onboarding?.completed ?? false,
  };
}

/* ───────────────────── Verify Email ───────────────────── */

export async function verifyEmail(token: string): Promise<AuthResult<{ userId: string }>> {
  const tokenHashValue = hashToken(token);

  const authToken = await db.query.authTokens.findFirst({
    where: and(
      eq(schema.authTokens.tokenHash, tokenHashValue),
      eq(schema.authTokens.type, "email_verify"),
      gt(schema.authTokens.expiresAt, new Date()),
      sql`${schema.authTokens.usedAt} IS NULL`
    ),
  });

  if (!authToken) {
    return { success: false, error: { code: "TOKEN_INVALID", message: "Invalid or expired verification link." } };
  }

  // Mark token as used and verify email
  await db.transaction(async (tx) => {
    await tx
      .update(schema.authTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.authTokens.id, authToken.id));

    await tx
      .update(schema.users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(schema.users.id, authToken.userId));
  });

  return { success: true, data: { userId: authToken.userId } };
}

/* ───────────────────── Resend Verification ───────────────────── */

export async function resendVerification(
  req: NextRequest,
  email: string
): Promise<AuthResult> {
  const ip = clientIp(req);
  const rl = rateLimit(`verify-resend:${ip}`, 3, 60 * 1000); // 3 per minute
  if (!rl.ok) {
    return { success: false, error: { code: "RATE_LIMITED", message: `Wait ${rl.retryAfterSec}s before retrying.` } };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.query.users.findFirst({
    where: eq(sql`lower(${schema.users.email})`, normalizedEmail),
  });

  // Always return success to prevent enumeration
  if (!user || user.emailVerifiedAt) {
    return { success: true };
  }

  // Invalidate old tokens
  await db
    .update(schema.authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.authTokens.userId, user.id),
        eq(schema.authTokens.type, "email_verify"),
        sql`${schema.authTokens.usedAt} IS NULL`
      )
    );

  // Create new token
  const { token, tokenHash } = generateToken();
  await db.insert(schema.authTokens).values({
    userId: user.id,
    type: "email_verify",
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Send verification email (fire-and-forget)
  sendVerificationEmail(normalizedEmail, token).catch((err) => {
    console.error("[auth/resend-verification] Failed to send email:", err);
  });

  return { success: true };
}

/* ───────────────────── Forgot Password ───────────────────── */

export async function forgotPassword(
  req: NextRequest,
  email: string
): Promise<AuthResult> {
  const ip = clientIp(req);
  const rl = rateLimit(`forgot-pw:${ip}`, 3, 60 * 1000);
  if (!rl.ok) {
    return { success: false, error: { code: "RATE_LIMITED", message: `Wait ${rl.retryAfterSec}s before retrying.` } };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.query.users.findFirst({
    where: eq(sql`lower(${schema.users.email})`, normalizedEmail),
  });

  // Always return success to prevent enumeration
  if (!user) return { success: true };

  // Invalidate old reset tokens
  await db
    .update(schema.authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.authTokens.userId, user.id),
        eq(schema.authTokens.type, "password_reset"),
        sql`${schema.authTokens.usedAt} IS NULL`
      )
    );

  // Create new reset token
  const { token, tokenHash } = generateToken();
  await db.insert(schema.authTokens).values({
    userId: user.id,
    type: "password_reset",
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  // Send password reset email (fire-and-forget)
  sendPasswordResetEmail(normalizedEmail, token).catch((err) => {
    console.error("[auth/forgot-password] Failed to send email:", err);
  });

  return { success: true };
}

/* ───────────────────── Reset Password ───────────────────── */

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<AuthResult> {
  const pwErr = validatePassword(newPassword);
  if (pwErr) return { success: false, error: { code: "VALIDATION_ERROR", message: pwErr } };

  const tokenHashValue = hashToken(token);

  const authToken = await db.query.authTokens.findFirst({
    where: and(
      eq(schema.authTokens.tokenHash, tokenHashValue),
      eq(schema.authTokens.type, "password_reset"),
      gt(schema.authTokens.expiresAt, new Date()),
      sql`${schema.authTokens.usedAt} IS NULL`
    ),
  });

  if (!authToken) {
    return { success: false, error: { code: "TOKEN_INVALID", message: "Invalid or expired reset link." } };
  }

  const passwordHash = await hashPassword(newPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.authTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.authTokens.id, authToken.id));

    await tx
      .update(schema.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, authToken.userId));

    // Invalidate all sessions for this user
    await tx
      .delete(schema.sessions)
      .where(eq(schema.sessions.userId, authToken.userId));
  });

  return { success: true };
}

/* ───────────────────── Helpers ───────────────────── */

async function getAndHashCurrentToken(): Promise<string | null> {
  const { getSessionToken } = await import("@/server/lib/session");
  const token = await getSessionToken();
  if (!token) return null;
  return hashToken(token);
}
