import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { getUserMissions, createMission, getActiveMission } from "@/server/services/mission-service";
import { enforceMissionExpiry } from "@/server/services/mission-expiration";
import { createMissionSchema } from "@/server/validators/mission";

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "draft" | "ready" | "active" | "passed" | null;

  await enforceMissionExpiry();

  if (status) {
    const missions = await getUserMissions(user.id, status);
    return ok({ missions });
  }

  const [missions, active] = await Promise.all([
    getUserMissions(user.id),
    getActiveMission(user.id),
  ]);

  return ok({ missions, active });
});

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "mission-create", 30, 60_000);
  const user = await requireUser();
  const body = await req.json();
  const input = createMissionSchema.parse(body);

  const mission = await createMission(input.taskId, user.id);
  return ok(mission);
});
