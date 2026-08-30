import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { socialReports } from "@/db/schema";
import { AppError } from "@/server/http";

const SPAM_WINDOW_MS = 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 3;

export async function reportContent(input: {
  reporterId: string;
  targetType: "user" | "comment" | "message" | "feed_event";
  targetId: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const recentCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(socialReports)
    .where(
      and(
        eq(socialReports.reporterId, input.reporterId),
        sql`${socialReports.createdAt} > now() - interval '1 minute' * ${SPAM_WINDOW_MS / 1000}`
      )
    )
    .then((r) => r[0]?.count ?? 0);

  if (recentCount >= MAX_REPORTS_PER_WINDOW) {
    throw new AppError("SPAM_DETECTED", "Too many reports. Please try again later.");
  }

  // Prevent duplicate reports on same target
  const existing = await db
    .select({ id: socialReports.id })
    .from(socialReports)
    .where(
      and(
        eq(socialReports.reporterId, input.reporterId),
        eq(socialReports.targetType, input.targetType),
        eq(socialReports.targetId, input.targetId)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    throw new AppError("VALIDATION_ERROR", "You have already reported this content.");
  }

  await db.insert(socialReports).values({
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    details: input.details ?? null,
  });
}
