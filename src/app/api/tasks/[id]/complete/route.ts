import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { idParamSchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import { completeTask } from "@/server/services/tasks-service";

/**
 * POST /api/tasks/:id/complete
 *
 * The authoritative task-completion pipeline (spec §35).
 * Returns the full reward payload including wallet state, streak, quest
 * progress, and any new achievements.
 */
export const POST = route(async (req: NextRequest, ctx: { params: { id: string } }) => {
  enforceRateLimit(req, "task-complete", 30, 60_000);
  const user = await requireUser();
  const { id } = idParamSchema.parse(ctx.params);
  const result = await completeTask(user.id, id);
  return ok(result);
});
