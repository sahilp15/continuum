import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection (edge-safe: cookie presence only, no DB). True
 * enforcement happens server-side in each protected page/action via
 * requireActor() — this layer only handles redirects so the UX is instant.
 *
 * This layer NEVER redirects authenticated-looking users away from the auth
 * pages. Cookie presence is not the same as a valid session: a signed session
 * cookie can survive a server restart that wiped the (dev, in-memory) session
 * row, so the cookie is "present" while the real session is gone. Bouncing
 * /sign-in → /home on cookie presence, while the server bounces /home → /sign-in
 * on the missing session, produces an infinite redirect loop. The "already
 * signed in, skip the form" UX therefore lives server-side in (auth)/layout.tsx,
 * gated on the REAL session — see getCurrentActor().
 */
const PROTECTED_PREFIXES = [
  "/home",
  "/spaces",
  "/projects",
  "/inbox",
  "/check",
  "/receipts",
  "/connectors",
  "/settings",
  "/onboarding",
];

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Unauthenticated → send to sign-in, preserving where they were headed.
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // NOTE: intentionally no "auth page + cookie → /home" redirect here. See the
  // module doc comment — that would loop against the server-side session gate
  // whenever a session cookie outlives its session row. The auth pages redirect
  // already-signed-in users themselves, using the real session.

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, the auth API, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
