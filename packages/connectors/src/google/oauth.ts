import { ContinuumError } from "@continuum/contracts";

/**
 * Google Workspace *connector* OAuth (spec: login ≠ connector auth). These
 * helpers speak to Google's OAuth endpoints directly via an injected fetch so
 * unit tests run against mocked HTTP — no googleapis SDK, no network. The
 * client credentials here are the CONNECTOR app (`GOOGLE_CONNECTOR_CLIENT_*`),
 * never the login app, and tokens are only ever persisted sealed in the
 * credential vault. Never log token material.
 */
export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Minimum readonly scopes — one consent covers Drive + Gmail + Calendar. */
export const GOOGLE_CONNECTOR_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

/** The token set sealed (as JSON) into the credential vault. */
export interface GoogleTokenSet {
  accessToken: string;
  /** Absent when Google omits it (re-consent without offline access). */
  refreshToken: string | null;
  /** ISO timestamp after which `accessToken` must be refreshed. */
  expiresAt: string;
  /** Space-separated scopes actually granted. */
  scope: string;
}

/** Build the user-consent URL. `state` must be a one-time anti-CSRF token the
 *  caller also stores (e.g. in an HttpOnly cookie) and verifies on callback. */
export function buildGoogleAuthUrl(cfg: GoogleOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: GOOGLE_CONNECTOR_SCOPES.join(" "),
    state,
    // Offline access → refresh token; prompt=consent guarantees Google returns
    // one even for repeat authorizations.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

async function tokenRequest(
  body: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<GoogleTokenResponse> {
  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const payload = (await response.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    // Deliberately exclude the response body from the message — it can echo
    // sensitive request parameters. The error code is enough to act on.
    throw new ContinuumError(
      "connector_unavailable",
      `google token endpoint rejected the request (${payload.error ?? response.status})`,
    );
  }
  return payload;
}

function toTokenSet(
  payload: GoogleTokenResponse,
  now: Date,
  previousRefreshToken: string | null = null,
): GoogleTokenSet {
  return {
    accessToken: payload.access_token!,
    refreshToken: payload.refresh_token ?? previousRefreshToken,
    expiresAt: new Date(now.getTime() + (payload.expires_in ?? 3600) * 1000).toISOString(),
    scope: payload.scope ?? "",
  };
}

/** Exchange an authorization code for a token set (connect time). */
export async function exchangeCode(
  cfg: GoogleOAuthConfig,
  code: string,
  fetchImpl: typeof fetch,
  now: Date = new Date(),
): Promise<GoogleTokenSet> {
  const payload = await tokenRequest(
    {
      grant_type: "authorization_code",
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
    },
    fetchImpl,
  );
  return toTokenSet(payload, now);
}

/** Refresh an expired access token. Keeps the existing refresh token when
 *  Google doesn't rotate it. */
export async function refreshAccessToken(
  cfg: GoogleOAuthConfig,
  refreshToken: string,
  fetchImpl: typeof fetch,
  now: Date = new Date(),
): Promise<GoogleTokenSet> {
  const payload = await tokenRequest(
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    },
    fetchImpl,
  );
  return toTokenSet(payload, now, refreshToken);
}

/** Best-effort token revocation at Google (used on disconnect). */
export async function revokeGoogleToken(token: string, fetchImpl: typeof fetch): Promise<void> {
  await fetchImpl(`${GOOGLE_REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
  }).catch(() => {
    // Revocation is best-effort: the vault entry is destroyed regardless, which
    // removes Continuum's access even if Google's revoke endpoint is down.
  });
}
