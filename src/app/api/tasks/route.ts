import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { createTaskSchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import { createTask, listTasks } from "@/server/services/tasks-service";
import { createMission, analyzeAndStore } from "@/server/services/mission-service";
import { isFeatureEnabled } from "@/server/feature-flags";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await listTasks(user.id));
});

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "task-create", 60, 60 * 1000);
  const user = await requireUser();
  const body = createTaskSchema.parse(await req.json());

  const task = await createTask(user.id, body);

  // If mission verification is enabled, auto-analyze and create mission
  const missionEnabled = await isFeatureEnabled("MISSION_VERIFICATION_ENABLED", user.id);
  if (missionEnabled) {
    try {
      await analyzeAndStore(task.id, user.id);
      const mission = await createMission(task.id, user.id);
      return ok({ task, mission });
    } catch (err) {
      console.warn("[tasks] Mission creation failed, returning task only:", err);
    }
  }

  return ok({ task });
});
