import { NextRequest } from "next/server";
import { db } from "@/db";
import { questProgress } from "@/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import { requireUser } from "@/server/session";
import { ok, route, enforceRateLimit } from "@/server/http";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "quest-history", 30, 60 * 1000);
  const user = await requireUser();

  const rows = await db
    .select({
      questId: questProgress.questId,
      counters: questProgress.counters,
      completedAt: questProgress.completedAt,
      claimedAt: questProgress.claimedAt,
      createdAt: questProgress.createdAt,
    })
    .from(questProgress)
    .where(
      and(
        eq(questProgress.userId, user.id),
        sql`${questProgress.claimedAt} is not null`
      )
    )
    .orderBy(desc(questProgress.claimedAt))
    .limit(50);

  return ok({
    history: rows.map((r) => ({
      questId: r.questId,
      startedAt: r.createdAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      claimedAt: r.claimedAt?.toISOString() ?? null,
    })),
  });
});
