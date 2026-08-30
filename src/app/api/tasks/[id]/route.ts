import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { deleteTask } from "@/server/services/tasks-service";

export const DELETE = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  enforceRateLimit(req, "task-delete", 30, 60_000);
  const user = await requireUser();
  const { id } = await ctx.params;
  await deleteTask(user.id, id);
  return ok({ deleted: true });
});
