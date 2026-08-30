import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { onboardingSchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import { completeOnboarding } from "@/server/services/onboarding-service";

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "onboarding", 10, 10 * 60 * 1000);
  const user = await requireUser();
  const body = onboardingSchema.parse(await req.json());
  await completeOnboarding(user.id, user.email, body);
  return ok({ complete: true });
});
