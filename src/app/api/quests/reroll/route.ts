import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { questProgress } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { AppError, enforceRateLimit, ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { selectDailyQuests } from "@/server/services/quest-engine";

const rerollSchema = z.object({ questId: z.string().min(1).max(120) });

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "quest-reroll", 5, 60 * 1000);
  const user = await requireUser();
  const { questId } = rerollSchema.parse(await req.json());

  const [row] = await db
    .select()
    .from(questProgress)
    .where(and(eq(questProgress.userId, user.id), eq(questProgress.questId, questId)))
    .limit(1);

  if (!row) throw new AppError("QUEST_NOT_FOUND", "Quest not found.");
  if (row.completedAt || row.claimedAt) throw new AppError("QUEST_NOT_REROLLABLE", "This quest cannot be rerolled.");
  if (!questId.startsWith("daily:")) throw new AppError("QUEST_NOT_REROLLABLE", "Only daily quests can be rerolled.");

  const todayKey = new Date().toISOString().slice(0, 10);
  const counters = (row.counters ?? {}) as Record<string, number>;
  if (counters[`reroll:${todayKey}`] && counters[`reroll:${todayKey}`] >= 1) {
    throw new AppError("QUEST_REROLL_USED", "You already used your daily reroll.");
  }

  const existingDailies = await db
    .select({ questId: questProgress.questId })
    .from(questProgress)
    .where(
      and(
        eq(questProgress.userId, user.id),
        sql`${questProgress.questId} like ${"daily:%"}`,
        sql`${questProgress.questId} != ${questId}`
      )
    );

  const existingIds = new Set(existingDailies.map((r) => {
    const parts = r.questId.split(":");
    return parts[1] ?? "";
  }));
  existingIds.add(questId.split(":")[1] ?? "");

  const [newDef] = selectDailyQuests(existingIds, 1);
  if (!newDef) throw new AppError("QUEST_REROLL_UNAVAILABLE", "No replacement quest available.");

  const newQuestId = `daily:${newDef.id}:${todayKey}`;

  await db.delete(questProgress).where(eq(questProgress.id, row.id));
  await db.insert(questProgress).values({
    userId: user.id,
    questId: newQuestId,
    counters: {},
  });

  return ok({
    oldQuestId: questId,
    newQuestId,
    newQuest: {
      id: newQuestId,
      title: newDef.title,
      description: newDef.description,
      category: newDef.category,
      difficulty: newDef.difficulty,
      emoji: newDef.emoji,
    },
  });
});
