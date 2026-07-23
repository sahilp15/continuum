import "server-only";
import { createGoogleWorkspaceConnector } from "@continuum/connectors";
import { createConnectorRuntime, type ConnectorRuntime } from "@continuum/db";
import { db } from "./db";
import { env, googleConnectorConfigured } from "./env";

/**
 * The real connector runtime (Gateway + AES-256-GCM vault + Drizzle stores),
 * or null when the credential vault / connector OAuth apps are not configured —
 * callers surface that honestly as "Setup required", never as a fake success.
 * Only REAL connectors are registered here; mock connectors stay in Demo Mode.
 */
const globalStore = globalThis as unknown as {
  __continuumConnectorRuntime?: Promise<ConnectorRuntime> | null;
};

/** HttpOnly cookie carrying the one-time OAuth anti-CSRF state + target Space. */
export const GOOGLE_OAUTH_STATE_COOKIE = "continuum_google_oauth";

/** Redirect URI must exactly match the connector OAuth app's registration. */
export function googleConnectorRedirectUri(): string {
  const base = env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/connectors/google/callback`;
}

async function init(): Promise<ConnectorRuntime> {
  const runtime = createConnectorRuntime({
    db,
    connectors: [
      createGoogleWorkspaceConnector({
        clientId: env.GOOGLE_CONNECTOR_CLIENT_ID!,
        clientSecret: env.GOOGLE_CONNECTOR_CLIENT_SECRET!,
        redirectUri: googleConnectorRedirectUri(),
      }),
    ],
    credentialKeys: env.CONTINUUM_CREDENTIAL_KEYS!,
  });
  await runtime.syncDefinitions();
  return runtime;
}

/** Cached runtime; null when not configured (missing keys/credentials). */
export function getConnectorRuntime(): Promise<ConnectorRuntime> | null {
  if (!googleConnectorConfigured) return null;
  return (globalStore.__continuumConnectorRuntime ??= init());
}
