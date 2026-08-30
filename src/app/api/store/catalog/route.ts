import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getCatalogForUser } from "@/server/services/store-service";

/** Catalog is served with live ownership state — prices never come from the client. */
export const GET = route(async () => {
  const user = await requireUser();
  return ok(await getCatalogForUser(user.id));
});
