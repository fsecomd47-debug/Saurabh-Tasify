import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { db } from "@/db";
import { missions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "@/server/http";
import { processReviewDecision } from "@/server/verification/review";
import { assertReviewer } from "@/server/verification/admin";

const reviewSchema = z.object({
  approved: z.boolean(),
  reason: z.string().max(200).optional(),
});

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  enforceRateLimit(req, "mission-review", 20, 60_000);
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = await req.json();
  const input = reviewSchema.parse(body);

  // §121/§141: only privileged reviewers may decide; owners can never
  // approve their own uncertain evidence.
  const mission = await db
    .select({ userId: missions.userId })
    .from(missions)
    .where(eq(missions.id, id))
    .limit(1);

  if (!mission[0]) {
    throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  }

  assertReviewer(user, mission[0].userId);

  const result = await processReviewDecision(id, input, user.id);
  return ok(result);
});
