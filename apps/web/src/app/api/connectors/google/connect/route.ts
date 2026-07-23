import { randomBytes } from "node:crypto";
import { buildGoogleAuthUrl } from "@continuum/connectors";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentActor } from "@/lib/actor";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  getConnectorRuntime,
  googleConnectorRedirectUri,
} from "@/lib/connectors";
import { env } from "@/lib/env";
import { getEnv } from "@/lib/services";

/**
 * Start the Google Workspace CONNECTOR authorization (strictly separate from
 * Google login — different OAuth app, readonly Workspace scopes, own consent).
 * Verifies the signed-in user owns the target Space, then sends them to
 * Google's consent screen with a one-time anti-CSRF `state` bound to an
 * HttpOnly cookie. Fails honestly when the connector isn't configured.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const actor = await getCurrentActor();
  if (!actor) {
    return NextResponse.redirect(new URL("/sign-in?returnTo=/connectors", request.url));
  }
  if (!getConnectorRuntime()) {
    return NextResponse.redirect(new URL("/connectors?error=not_configured", request.url));
  }

  // The user must have access to the Space the connector will feed.
  const spaces = await getEnv().tenancy.listUserSpaces(actor.userId);
  const requested = request.nextUrl.searchParams.get("spaceId");
  const space = requested ? spaces.find((s) => s.id === requested) : spaces[0];
  if (!space) {
    return NextResponse.redirect(new URL("/connectors?error=no_space", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = buildGoogleAuthUrl(
    {
      clientId: env.GOOGLE_CONNECTOR_CLIENT_ID!,
      clientSecret: env.GOOGLE_CONNECTOR_CLIENT_SECRET!,
      redirectUri: googleConnectorRedirectUri(),
    },
    state,
  );

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, JSON.stringify({ state, spaceId: space.id }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // one consent round-trip; cleared on callback
  });
  return response;
}
