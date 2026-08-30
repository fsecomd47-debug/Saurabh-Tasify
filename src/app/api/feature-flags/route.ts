import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getFeatureFlags } from "@/server/feature-flags";

export const GET = route(async () => {
  await requireUser();
  const flags = await getFeatureFlags();
  return ok({ flags });
});
