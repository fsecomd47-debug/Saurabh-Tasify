import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { clientIp, rateLimit, sameOriginGuard } from "@/lib/auth/rate-limit";
import { UnauthenticatedError } from "@/server/session";

/* ─────────────────────────── Error codes ────────────────────────── */

export type ErrorCode =
  // auth
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_EXISTS"
  | "EMAIL_UNVERIFIED"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "RATE_LIMITED"
  // validation
  | "VALIDATION_ERROR"
  // economy / domain
  | "TASK_NOT_FOUND"
  | "TASK_ALREADY_COMPLETED"
  | "INSUFFICIENT_BALANCE"
  | "ITEM_NOT_FOUND"
  | "ITEM_ALREADY_OWNED"
  | "LEVEL_LOCKED"
  | "QUEST_NOT_FOUND"
  | "QUEST_ALREADY_CLAIMED"
  | "QUEST_NOT_COMPLETED"
  | "ALREADY_EQUIPPED"
  | "ONBOARDING_ALREADY_COMPLETE"
  | "PROFILE_VALIDATION_ERROR"
  | "DISPLAY_NAME_TAKEN"
  | "DISPLAY_NAME_INVALID"
  // missions
  | "MISSION_NOT_FOUND"
  | "MISSION_NOT_READY"
  | "MISSION_START_FAILED"
  | "MISSION_TERMINAL"
  | "ANALYSIS_FAILED"
  | "VERIFICATION_FAILED"
  | "SETTLEMENT_FAILED"
  | "CHEAT_DETECTED"
  | "EVIDENCE_REPLAY"
  | "QUEST_NOT_REROLLABLE"
  | "QUEST_REROLL_USED"
  | "QUEST_REROLL_UNAVAILABLE"
  // vision
  | "VISION_SESSION_NOT_FOUND"
  | "VISION_SESSION_INACTIVE"
  | "VISION_PROVIDER_ERROR"
  | "VISION_QUALITY_LOW"
  // compound / chain / checkpoint
  | "MISSION_NOT_ACTIVE"
  | "COMPOUND_STEP_FAILED"
  | "CHAIN_NOT_FOUND"
  | "STATE_TRANSITION_INVALID"
  // pets
  | "PET_NOT_FOUND"
  | "PET_ALREADY_OWNED"
  | "PET_NOT_OWNED"
  | "MINING_SESSION_ACTIVE"
  | "MINING_SETTLEMENT_FAILED"
  // daily rewards
  | "DAILY_REWARD_COMPLETE"
  | "DAILY_REWARD_ALREADY_CLAIMED"
  // social
  | "FRIEND_REQUEST_EXISTS"
  | "ALREADY_FRIENDS"
  | "NOT_FRIENDS"
  | "CANNOT_FRIEND_SELF"
  | "USER_BLOCKED"
  | "BLOCK_EXISTS"
  | "CHALLENGE_NOT_FOUND"
  | "CHALLENGE_NOT_PENDING"
  | "CHALLENGE_NOT_ACTIVE"
  | "CHALLENGE_ALREADY_ACCEPTED"
  | "MESSAGE_TOO_LONG"
  | "SPAM_DETECTED"
  // infra
  | "NOT_FOUND"
  | "CONFLICT"
  | "NETWORK_FAILURE"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_EXISTS: 409,
  EMAIL_UNVERIFIED: 403,
  INVALID_TOKEN: 400,
  TOKEN_EXPIRED: 410,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  TASK_NOT_FOUND: 404,
  TASK_ALREADY_COMPLETED: 409,
  INSUFFICIENT_BALANCE: 402,
  ITEM_NOT_FOUND: 404,
  ITEM_ALREADY_OWNED: 409,
  LEVEL_LOCKED: 403,
  QUEST_NOT_FOUND: 404,
  QUEST_ALREADY_CLAIMED: 409,
  QUEST_NOT_COMPLETED: 409,
  QUEST_NOT_REROLLABLE: 400,
  QUEST_REROLL_USED: 409,
  QUEST_REROLL_UNAVAILABLE: 500,
  ALREADY_EQUIPPED: 409,
  ONBOARDING_ALREADY_COMPLETE: 409,
  PROFILE_VALIDATION_ERROR: 400,
  DISPLAY_NAME_TAKEN: 409,
  DISPLAY_NAME_INVALID: 400,
  PET_NOT_FOUND: 404,
  PET_ALREADY_OWNED: 409,
  PET_NOT_OWNED: 404,
  MINING_SESSION_ACTIVE: 409,
  MINING_SETTLEMENT_FAILED: 500,
  DAILY_REWARD_COMPLETE: 409,
  DAILY_REWARD_ALREADY_CLAIMED: 409,
  FRIEND_REQUEST_EXISTS: 409,
  ALREADY_FRIENDS: 409,
  NOT_FRIENDS: 409,
  CANNOT_FRIEND_SELF: 400,
  USER_BLOCKED: 403,
  BLOCK_EXISTS: 409,
  CHALLENGE_NOT_FOUND: 404,
  CHALLENGE_NOT_PENDING: 409,
  CHALLENGE_NOT_ACTIVE: 409,
  CHALLENGE_ALREADY_ACCEPTED: 409,
  MESSAGE_TOO_LONG: 400,
  SPAM_DETECTED: 429,
  NOT_FOUND: 404,
  CONFLICT: 409,
  NETWORK_FAILURE: 503,
  INTERNAL: 500,
  MISSION_NOT_FOUND: 404,
  MISSION_NOT_READY: 409,
  MISSION_START_FAILED: 409,
  MISSION_TERMINAL: 409,
  ANALYSIS_FAILED: 422,
  VERIFICATION_FAILED: 500,
  SETTLEMENT_FAILED: 500,
  CHEAT_DETECTED: 403,
  EVIDENCE_REPLAY: 409,
  VISION_SESSION_NOT_FOUND: 404,
  VISION_SESSION_INACTIVE: 409,
  VISION_PROVIDER_ERROR: 500,
  VISION_QUALITY_LOW: 422,
  MISSION_NOT_ACTIVE: 409,
  COMPOUND_STEP_FAILED: 409,
  CHAIN_NOT_FOUND: 404,
  STATE_TRANSITION_INVALID: 409,
};

export class AppError extends Error {
  code: ErrorCode;
  meta?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

/* ─────────────────────── Response envelope ──────────────────────── */

export type ApiEnvelope<T> = {
  data: T | null;
  error: { code: ErrorCode; message: string } | null;
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data, error: null }, init);
}

export function fail(code: ErrorCode, message: string): NextResponse {
  return NextResponse.json(
    { data: null, error: { code, message } },
    { status: STATUS_BY_CODE[code] }
  );
}

/* ───────────────────────── Route wrapper ───────────────────────── */

type HandlerFn = (req: NextRequest, ctx: any) => Promise<NextResponse>;

/**
 * Wraps a route handler with:
 *  - same-origin CSRF guard on mutations (defense-in-depth beyond SameSite=Lax)
 *  - AppError/ZodError/unknown error mapping into the stable envelope
 * Never leaks stack traces to clients (spec §68/§74).
 */
export function route(handler: HandlerFn): HandlerFn {
  return async (req: NextRequest, ctx: any) => {
    if (req.method !== "GET" && !sameOriginGuard(req)) {
      return fail("FORBIDDEN", "Cross-origin request blocked.");
    }
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof UnauthenticatedError) {
        return fail("UNAUTHENTICATED", "Authentication required.");
      }
      if (err instanceof AppError) {
        if (err.code === "INTERNAL") logSecurity("internal_error", { path: req.nextUrl.pathname, detail: err.message });
        return err.meta
          ? NextResponse.json({ data: null, error: { code: err.code, message: err.message, ...err.meta } }, { status: STATUS_BY_CODE[err.code] })
          : fail(err.code, err.message);
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        const field = first?.path?.join(".") ?? "";
        return fail("VALIDATION_ERROR", field ? `${field}: ${first.message}` : first?.message ?? "Invalid input.");
      }
      console.error(`[api] ${req.method} ${req.nextUrl.pathname} failed:`, err);
      return fail("INTERNAL", "Something went wrong on our side. Please try again.");
    }
  };
}

/** Throws RATE_LIMITED unless under budget. Keyed by limiter bucket name + IP. */
export function enforceRateLimit(req: NextRequest, bucket: string, limit: number, windowMs: number): void {
  const res = rateLimit(`${bucket}:${clientIp(req)}`, limit, windowMs);
  if (!res.ok) {
    throw new AppError("RATE_LIMITED", `Too many attempts. Try again in ${res.retryAfterSec}s.`);
  }
}

/* ───────────────────────── Security log ────────────────────────── */

export function logSecurity(event: string, fields: Record<string, unknown> = {}): void {
  // Structured, secret-free security event log (spec §75).
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "security", event, ...fields }));
}
