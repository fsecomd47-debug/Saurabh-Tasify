import "server-only";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, onboardingProfiles, profiles, sessions, users, wallets } from "@/db/schema";
import { generateToken, hashPassword, sha256, verifyPassword } from "@/lib/auth/password";
import { AppError, logSecurity } from "@/server/http";
import { createSession, destroyCurrentSession } from "@/server/session";
import { sendMail, resetEmail } from "@/server/email";
import { completeOnboarding } from "./onboarding-service";
import { checkDisplayNameAvailable } from "./username-service";

const RESET_TTL_MS = 60 * 60 * 1000; // 1h

export type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
  avatarId?: string;
};

/**
 * Registration. Deliberately does NOT reveal whether an email already exists
 * beyond a single signup-time check (spec §46) — login & password-reset paths
 * are fully neutral.
 */
export async function register(input: RegisterInput): Promise<{ userId: string }> {
  const email = input.email.trim().toLowerCase();
  const existing = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (existing[0]) {
    throw new AppError("ACCOUNT_EXISTS", "An account with this email already exists. Try signing in instead.");
  }

  // Check display name uniqueness
  const nameCheck = await checkDisplayNameAvailable(input.displayName);
  if (!nameCheck.available) {
    throw new AppError("DISPLAY_NAME_TAKEN", `The name "${input.displayName}" is already taken. Try a different one.`);
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning({ id: users.id });

  await db.insert(profiles).values({
    userId: user.id,
    displayName: input.displayName.trim(),
    avatarId: input.avatarId || "avatar-wolf",
  });

  // Auto-complete onboarding with defaults so user lands directly on /home
  await completeOnboarding(user.id, email, {
    displayName: input.displayName.trim(),
    avatarId: input.avatarId || "avatar-wolf",
    preferredCategories: ["personal"],
    dailyCommitmentMinutes: 20,
    primaryGoal: "Build a productive habit",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    playstyle: "balanced",
  });

  logSecurity("register_success", { userId: user.id, email: mask(email) });
  return { userId: user.id };
}

/** Issues a hashed, single-use auth token of the given type (invalidates previous ones). */
async function issueAuthToken(userId: string, type: "email_verify" | "password_reset", ttlMs: number): Promise<string> {
  const { token, tokenHash } = generateToken(32);
  await db.delete(authTokens).where(and(eq(authTokens.userId, userId), eq(authTokens.type, type)));
  await db.insert(authTokens).values({
    userId,
    type,
    tokenHash,
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return token;
}

export async function login(email: string, password: string): Promise<{ token: string; userId: string }> {
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  const user = rows[0];

  // Uniform failure path — never reveal which half was wrong (spec §46).
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    logSecurity("login_failed", { email: mask(normalized) });
    throw new AppError("INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  const token = await createSession(user.id);
  logSecurity("login_success", { userId: user.id });
  return { token, userId: user.id };
}

export async function logout(): Promise<void> {
  await destroyCurrentSession();
}

export async function verifyEmail(_token: string): Promise<void> {
  // Verification removed — no-op.
}

export async function resendVerification(_email: string): Promise<{ devUrl?: string }> {
  // Verification removed — no-op.
  return {};
}

/** Always-neutral response semantics (spec §43/§46). */
export async function requestPasswordReset(email: string): Promise<{ devUrl?: string }> {
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  const user = rows[0];
  if (user) {
    const rawToken = await issueAuthToken(user.id, "password_reset", RESET_TTL_MS);
    const url = `${appUrl()}/reset-password?token=${rawToken}`;
    const mail = await sendMail({ to: user.email, ...resetEmail(url) });
    logSecurity("password_reset_requested", { userId: user.id });
    return {};
  }
  return {};
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = sha256(token);
  const rows = await db
    .select({ id: authTokens.id, userId: authTokens.userId })
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, tokenHash), gt(authTokens.expiresAt, new Date()), isNull(authTokens.usedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AppError("INVALID_TOKEN", "This reset link is invalid or has expired.");

  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
    await tx.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id));
    // Revoke every existing session — a reset means "kick everyone out".
    await tx.delete(sessions).where(eq(sessions.userId, row.userId));
    // Ensure a wallet exists for safety in case reset happens pre-onboarding.
    const w = await tx.select({ id: wallets.id }).from(wallets).where(eq(wallets.userId, row.userId)).limit(1);
    if (!w[0]) await tx.insert(wallets).values({ userId: row.userId, balance: 0 });
  });
  logSecurity("password_reset_completed", { userId: row.userId });
}

async function consumeAuthToken(rawToken: string, type: "email_verify" | "password_reset"): Promise<string> {
  const tokenHash = sha256(rawToken);
  const rows = await db
    .select({ id: authTokens.id, userId: authTokens.userId })
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, tokenHash), eq(authTokens.type, type), gt(authTokens.expiresAt, new Date()), isNull(authTokens.usedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AppError("INVALID_TOKEN", "This link is invalid or has expired.");
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id));
  if (type === "email_verify") {
    await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, row.userId));
    logSecurity("email_verified", { userId: row.userId });
  }
  return row.userId;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function mask(email: string): string {
  const [n, d] = email.split("@");
  return d ? `${n.slice(0, 2)}***@${d}` : "***";
}
