import { NextRequest, NextResponse } from "next/server";

/**
 * Edge route gate (spec §15/§61).
 * Middleware only checks cookie PRESENCE — full cryptographic session
 * validation happens server-side in layouts and every API route.
 *
 * NOTE: We do NOT redirect away from auth pages based on cookie presence.
 * The cookie may be stale (DB session deleted/expired). The server-side
 * layout is the authoritative session check — let it handle redirects.
 */

const PROTECTED = ["/home", "/tasks", "/quests", "/vault", "/leaderboard", "/statistics", "/profile", "/settings", "/social"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = !!req.cookies.get("st_session")?.value;

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Unauthenticated → login page. Server-side layout handles the real check.
  if (!hasCookie && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home/:path*",
    "/tasks/:path*",
    "/quests/:path*",
    "/vault/:path*",
    "/leaderboard/:path*",
    "/statistics/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/social/:path*",
  ],
};
