import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { analyzeAndStore } from "@/server/services/mission-service";
import { analyzeTaskSchema } from "@/server/validators/mission";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  enforceRateLimit(req, "task-analyze", 20, 60_000);
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const _input = analyzeTaskSchema.parse(body);

  const analysis = await analyzeAndStore(id, user.id);
  return ok(analysis);
});
