import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getSnapshot } from "@/server/services/player-service";

/** Full player hydration snapshot — the client's single bootstrap query. */
export const GET = route(async () => {
  const user = await requireUser();
  const snapshot = await getSnapshot(user.id);
  return ok({ email: user.email, emailVerified: user.emailVerified, ...snapshot });
});
