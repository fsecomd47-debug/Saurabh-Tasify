import { NextRequest } from "next/server";
import { ok, fail, route, enforceRateLimit } from "@/server/http";
import { register } from "@/server/services/auth-service";
import { registerSchema } from "@/server/validation";
import { attachSessionCookie } from "@/server/session";

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "auth-register", 5, 10 * 60 * 1000);

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input.";
    return fail("VALIDATION_ERROR", msg);
  }

  const { userId } = await register(parsed.data);

  // Create session so user is immediately logged in
  const { createSession } = await import("@/server/session");
  const token = await createSession(userId);

  const res = ok({ userId });
  return attachSessionCookie(res, token);
});
