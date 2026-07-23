import { NextResponse, type NextRequest } from "next/server";
import { getCurrentActor } from "@/lib/actor";
import { GOOGLE_OAUTH_STATE_COOKIE, getConnectorRuntime } from "@/lib/connectors";
import { getEnv } from "@/lib/services";

/**
 * Google Workspace connector OAuth callback. Validates the anti-CSRF `state`
 * against the HttpOnly cookie set at /connect, re-checks the user's Space
 * access, then hands the authorization code to the Gateway — which exchanges
 * it and seals the token set into the encrypted vault. Cancelling at Google or
 * any failure lands back on /connectors with an honest error; nothing is lost.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const back = (suffix: string) => {
    const response = NextResponse.redirect(new URL(`/connectors${suffix}`, request.url));
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  };

  const actor = await getCurrentActor();
  if (!actor) return back("?error=signed_out");

  const runtimePromise = getConnectorRuntime();
  if (!runtimePromise) return back("?error=not_configured");

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return back("?error=google_denied");

  // CSRF check: the state Google echoes must match the cookie we set.
  const cookieRaw = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const code = params.get("code");
  let expected: { state?: string; spaceId?: string } = {};
  try {
    expected = cookieRaw ? (JSON.parse(cookieRaw) as typeof expected) : {};
  } catch {
    expected = {};
  }
  if (!code || !expected.state || params.get("state") !== expected.state) {
    return back("?error=invalid_state");
  }

  // Re-validate Space access with the REAL session (cookie contents are not trusted).
  const spaces = await getEnv().tenancy.listUserSpaces(actor.userId);
  const space = spaces.find((s) => s.id === expected.spaceId);
  if (!space) return back("?error=no_space");

  try {
    const runtime = await runtimePromise;
    await runtime.gateway.connect({
      organizationId: space.organizationId,
      spaceId: space.id,
      connectorId: "google-workspace",
      dataMode: "user_selected",
      credential: code,
    });
    return back("?connected=google");
  } catch {
    // Never leak provider error bodies (may echo request parameters).
    return back("?error=connect_failed");
  }
}
