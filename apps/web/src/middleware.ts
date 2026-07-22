import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection (edge-safe: cookie presence only, no DB). True
 * enforcement happens server-side in each protected page/action via
 * requireActor() — this layer only handles redirects so the UX is instant.
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

const AUTH_PAGES = ["/sign-in", "/sign-up"];

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Unauthenticated → send to sign-in, preserving where they were headed.
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Authenticated users shouldn't sit on sign-in/sign-up.
  if (isAuthPage && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, the auth API, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
