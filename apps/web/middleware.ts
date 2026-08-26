import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Paths that never require a web session. /api/auth is better-auth's own
// endpoints; /api/v1 is the mobile API (each route authorizes via bearer token);
// /api/cron/ routes authorize via their own CRON_SECRET bearer check - an
// external pinger has no session cookie, so without this they'd 401 here
// before ever reaching the route handler.
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/v1/",
  "/api/cron/",
  // /api/health is how the mobile app checks a server URL before saving it,
  // which necessarily happens before anyone has signed in. It returns nothing
  // but a liveness timestamp.
  "/api/health",
  "/_next",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

// Optimistic cookie check only (edge-safe). Real validation happens
// server-side via auth.api.getSession in layouts/actions/routes.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!getSessionCookie(request)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
