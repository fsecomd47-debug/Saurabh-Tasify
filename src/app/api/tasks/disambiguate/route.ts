import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { checkAmbiguity } from "@/server/ai/disambiguation";

const disambiguateSchema = z.object({
  title: z.string().min(1).max(200),
});

/**
 * POST /api/tasks/disambiguate — Check if a task title needs clarification.
 * Requires authentication.
 */
export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "disambiguate", 30, 60_000);
  await requireUser();
  const body = await req.json();
  const { title } = disambiguateSchema.parse(body);
  const result = checkAmbiguity(title);
  return ok(result);
});
