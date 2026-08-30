import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { profilePatchSchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import { updateProfile } from "@/server/services/onboarding-service";

export const PATCH = route(async (req: NextRequest) => {
  enforceRateLimit(req, "profile-patch", 20, 10 * 60 * 1000);
  const user = await requireUser();
  const body = profilePatchSchema.parse(await req.json());
  if (Object.keys(body).length === 0) return ok({ updated: false });
  await updateProfile(user.id, body);
  return ok({ updated: true });
});
