import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions } from "@/db/schema";
import { logSecurity } from "@/server/http";

const EXPIRY_MULTIPLIER = 2.5; // Expire if 2.5x expected duration has passed

/**
 * Expire missions that were started but never completed within deadline.
 * Should be called periodically (e.g., cron job or on mission list query).
 */
export async function expireStaleMissions(): Promise<{ expired: number }> {
  const staleThreshold = new Date();

  // Find active missions where startedAt + (durationSeconds * EXPIRY_MULTIPLIER) < now
  const expired = await db.update(missions)
    .set({
      status: "expired",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(missions.status, "active"),
      sql`${missions.startedAt} IS NOT NULL`,
      sql`${missions.durationSeconds} IS NOT NULL`,
      sql`${missions.startedAt} + (${missions.durationSeconds} * ${EXPIRY_MULTIPLIER} * interval '1 second') < ${staleThreshold}`
    ))
    .returning();

  if (expired.length > 0) {
    logSecurity("missions_expired", { count: expired.length });
  }

  return { expired: expired.length };
}

/**
 * Get missions that are overdue (past expected duration but not yet expired).
 */
export async function getOverdueMissions(userId: string): Promise<{ missionId: string; overdueMinutes: number }[]> {
  const now = new Date();
  const overdue = await db.select({
    id: missions.id,
    startedAt: missions.startedAt,
    durationSeconds: missions.durationSeconds,
  })
    .from(missions)
    .where(and(
      eq(missions.userId, userId),
      eq(missions.status, "active"),
      sql`${missions.startedAt} IS NOT NULL`,
      sql`${missions.durationSeconds} IS NOT NULL`,
      sql`${missions.startedAt} + (${missions.durationSeconds} * interval '1 second') < ${now}`
    ));

  return overdue.map((m) => ({
    missionId: m.id,
    overdueMinutes: Math.round((now.getTime() - (m.startedAt?.getTime() ?? 0)) / 60000) - (m.durationSeconds ?? 0) / 60,
  }));
}

/* ─────────────────── Lazy expiry enforcement ────────────────────── */

let lastExpirySweep = 0;
const EXPIRY_SWEEP_INTERVAL_MS = 30_000;

/**
 * §63/§111: Expired missions must never settle. Called lazily on
 * mission read/start/verify/claim paths; internally throttled so busy
 * clients cannot turn it into a write storm.
 */
export async function enforceMissionExpiry(): Promise<void> {
  const now = Date.now();
  if (now - lastExpirySweep < EXPIRY_SWEEP_INTERVAL_MS) return;
  lastExpirySweep = now;
  try {
    await expireStaleMissions();
  } catch {
    // Expiry is an integrity backstop — a failed sweep must not break
    // the read path. The next sweep will retry.
  }
}
