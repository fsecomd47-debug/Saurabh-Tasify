import { NextRequest } from "next/server";
import { ok, route, fail, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { sendMessage, getConversations } from "@/server/services/social-messaging-service";
import { z } from "zod";

const sendSchema = z.object({
  receiverId: z.string().uuid(),
  body: z.string().min(1).max(500),
});

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "social-messages", 30, 60 * 1000);
  const user = await requireUser();
  const conversations = await getConversations(user.id);
  return ok({ conversations });
});

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "message-send", 30, 60 * 1000);
  const user = await requireUser();
  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0].message);

  const message = await sendMessage(user.id, parsed.data.receiverId, parsed.data.body);
  return ok({ message });
});
