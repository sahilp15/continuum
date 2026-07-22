import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Clear a stale session and route to sign-in.
 *
 * A signed Better Auth session cookie can outlive its session row (e.g. a dev
 * server restart wipes the in-memory DB but the browser keeps the cookie). The
 * cookie then reads as "present" to the edge middleware while the real session
 * is gone — the mismatch that caused the /home ↔ /sign-in redirect loop. When a
 * protected page resolves no Actor, it sends the user here so the stale cookie
 * is actually removed: afterwards cookie-presence and the real session agree,
 * and the user lands cleanly on the sign-in form (one redirect, no loop).
 *
 * Only produces an internal redirect to /sign-in; `returnTo` is sanitized to a
 * same-origin path so it can't be used as an open redirect.
 */
function safeReturnTo(raw: string | null): string {
  // Must be a single-slash-rooted relative path (not "//host" or "/\host").
  if (raw && /^\/(?![/\\])/.test(raw)) return raw;
  return "/home";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));

  // Best-effort server-side revocation (no-op / throws harmlessly if the session
  // is already gone). We clear the cookies ourselves below regardless.
  try {
    await auth.api.signOut({ headers: request.headers });
  } catch {
    // Session already invalid — nothing to revoke; fall through to cookie clear.
  }

  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = "";
  url.searchParams.set("returnTo", returnTo);
  const response = NextResponse.redirect(url);

  // Expire every Better Auth cookie the browser sent (session token, secure
  // variant, cookie-cache, chunks). Deleting by the exact names we saw is more
  // reliable than guessing prefixes across environments.
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.includes("better-auth")) {
      response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
    }
  }
  return response;
}
