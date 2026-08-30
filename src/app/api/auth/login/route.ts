import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, route, enforceRateLimit } from "@/server/http";
import { login } from "@/server/services/auth-service";
import { attachSessionCookie } from "@/server/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "auth-login", 10, 5 * 60 * 1000);

  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Enter a valid email and password.");
  }

  const { token } = await login(parsed.data.email, parsed.data.password);

  const res = ok({ userId: true });
  return attachSessionCookie(res, token);
});
