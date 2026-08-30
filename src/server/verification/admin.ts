import "server-only";
import type { SessionUser } from "@/server/session";
import { AppError, logSecurity } from "@/server/http";

/**
 * PDR-4 §121/§122: Human review decisions are privileged operations.
 * Reviewers come from an explicit server-side allowlist. Mission owners
 * can never decide their own review, even when they are reviewers.
 */
export function isReviewer(user: SessionUser): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowlist = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(user.email.toLowerCase());
}

export function assertReviewer(user: SessionUser, missionOwnerId: string): void {
  if (!isReviewer(user)) {
    logSecurity("review_decision_unauthorized", { userId: user.id });
    throw new AppError("FORBIDDEN", "Review decisions require a reviewer account.");
  }
  if (user.id === missionOwnerId) {
    logSecurity("review_self_decision_blocked", { userId: user.id });
    throw new AppError("FORBIDDEN", "Reviewers cannot decide their own missions.");
  }
}
