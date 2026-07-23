import type { ConnectorExecutionContext } from "@continuum/connectors-core";
import { ContinuumError, type ConnectorInstallation } from "@continuum/contracts";
import {
  createCredentialKeyring,
  createEncryptedCredentialVault,
  createInMemorySealedSecretStore,
  generateCredentialKey,
  type SealedSecretStore,
} from "@continuum/integrations";
import { createLogger } from "@continuum/observability";
import { describe, expect, it } from "vitest";
import { createGoogleWorkspaceConnector } from "./connector.js";
import { buildGoogleAuthUrl, GOOGLE_TOKEN_ENDPOINT, type GoogleTokenSet } from "./oauth.js";

const CFG = {
  clientId: "connector-client-id.apps.googleusercontent.com",
  clientSecret: "connector-secret",
  redirectUri: "http://localhost:3000/api/connectors/google/callback",
};

/** Deterministic fake Google backend: pattern-match URLs → canned JSON. */
function fakeGoogle(overrides?: {
  onToken?: (body: string) => Record<string, unknown>;
  unauthorizedOnce?: { remaining: number };
}) {
  const calls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url.split("?")[0]!);
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
      });

    if (url.startsWith(GOOGLE_TOKEN_ENDPOINT)) {
      const body = String(init?.body ?? "");
      if (overrides?.onToken) return json(overrides.onToken(body));
      const isRefresh = body.includes("grant_type=refresh_token");
      return json({
        access_token: isRefresh ? "refreshed-access" : "initial-access",
        ...(isRefresh ? {} : { refresh_token: "refresh-1" }),
        expires_in: 3600,
        scope:
          "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly",
      });
    }

    if (overrides?.unauthorizedOnce && overrides.unauthorizedOnce.remaining > 0) {
      overrides.unauthorizedOnce.remaining -= 1;
      return json({ error: { code: 401 } }, 401);
    }

    if (url.includes("/drive/v3/about")) return json({ user: { displayName: "T" } });
    if (url.includes("/drive/v3/files/")) {
      if (url.includes("/export")) return new Response("Exported doc text.", { status: 200 });
      return json({
        id: "f1",
        name: "Brand guide",
        mimeType: "application/vnd.google-apps.document",
        webViewLink: "https://docs.google.com/document/d/f1",
        shared: true,
        owners: [{ displayName: "Ada", emailAddress: "ada@example.com" }],
      });
    }
    if (url.includes("/drive/v3/files")) {
      return json({
        files: [
          { id: "f1", name: "Brand guide", mimeType: "application/vnd.google-apps.document" },
          { id: "d1", name: "Assets", mimeType: "application/vnd.google-apps.folder" },
        ],
      });
    }
    if (url.includes("/gmail/v1/users/me/messages/")) {
      return json({
        id: "m1",
        threadId: "t1",
        internalDate: "1750000000000",
        payload: {
          mimeType: "text/plain",
          headers: [
            { name: "Subject", value: "Launch timing" },
            { name: "From", value: '"Kai Chen" <kai@example.com>' },
          ],
          body: { data: Buffer.from("The launch moved to March 21.").toString("base64url") },
        },
      });
    }
    if (url.includes("/gmail/v1/users/me/messages")) {
      return json({ messages: [{ id: "m1" }] });
    }
    if (url.includes("/calendar/v3/calendars/primary/events/")) {
      return json({
        id: "e1",
        summary: "Compliance review",
        start: { dateTime: "2026-08-01T10:00:00Z" },
        end: { dateTime: "2026-08-01T11:00:00Z" },
        attendees: [{ email: "legal@example.com" }],
      });
    }
    if (url.includes("/calendar/v3/calendars/primary/events")) {
      return json({ items: [{ id: "e1", summary: "Compliance review" }] });
    }
    return json({ error: "unmatched url in fake google" }, 500);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function makeContext(fetchImpl: typeof fetch): {
  context: ConnectorExecutionContext;
  secretStore: SealedSecretStore;
  vault: ReturnType<typeof createEncryptedCredentialVault>;
} {
  const secretStore = createInMemorySealedSecretStore();
  const vault = createEncryptedCredentialVault({
    keyring: createCredentialKeyring(`v1:${generateCredentialKey()}`),
    store: secretStore,
  });
  const installation: ConnectorInstallation = {
    id: "cin_test1234",
    organizationId: "org_test1234",
    spaceId: "spc_test1234",
    connectorId: "google-workspace",
    dataMode: "user_selected",
    status: "connected",
    credentialRef: "cred_test1234",
    grantedScopes: [],
    installedAt: new Date().toISOString(),
    revokedAt: null,
  };
  return {
    context: {
      organizationId: "org_test1234",
      spaceId: "spc_test1234",
      installation,
      vault,
      logger: createLogger({ name: "test", sink: () => undefined }),
      fetchImpl,
    },
    secretStore,
    vault,
  };
}

async function seedTokens(
  vault: ReturnType<typeof createEncryptedCredentialVault>,
  tokens: Partial<GoogleTokenSet>,
): Promise<void> {
  await vault.store(
    "cred_test1234",
    JSON.stringify({
      accessToken: "seed-access",
      refreshToken: "refresh-1",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      scope: "drive gmail calendar",
      ...tokens,
    }),
  );
}

describe("google oauth url", () => {
  it("requests offline access with only the readonly scopes and the state", () => {
    const url = new URL(buildGoogleAuthUrl(CFG, "state-xyz"));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe(CFG.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(CFG.redirectUri);
    expect(url.searchParams.get("state")).toBe("state-xyz");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    const scope = url.searchParams.get("scope")!;
    expect(scope).toContain("drive.readonly");
    expect(scope).toContain("gmail.readonly");
    expect(scope).toContain("calendar.readonly");
    // Readonly only — no write scopes, ever.
    expect(scope).not.toMatch(
      /gmail\.(send|modify)|drive(?!\.readonly)\b|calendar(?!\.readonly)\b/,
    );
  });
});

describe("google workspace connector", () => {
  it("connect exchanges the code and seals tokens (never plaintext at rest)", async () => {
    const { fetchImpl } = fakeGoogle();
    const { context, secretStore, vault } = makeContext(fetchImpl);
    const connector = createGoogleWorkspaceConnector(CFG);

    const result = await connector.connect(
      {
        organizationId: "org_test1234",
        spaceId: "spc_test1234",
        dataMode: "user_selected",
        credential: "auth-code-1",
        config: {},
      },
      context,
    );
    expect(result.status).toBe("connected");
    expect(result.grantedScopes.join(" ")).toContain("drive.readonly");

    const sealed = await secretStore.get("cred_test1234");
    expect(JSON.stringify(sealed)).not.toContain("initial-access");
    const tokens = JSON.parse((await vault.retrieve("cred_test1234"))!) as GoogleTokenSet;
    expect(tokens.accessToken).toBe("initial-access");
    expect(tokens.refreshToken).toBe("refresh-1");
  });

  it("refreshes an expired access token before calling the api and re-seals it", async () => {
    const { fetchImpl, calls } = fakeGoogle();
    const { context, vault } = makeContext(fetchImpl);
    await seedTokens(vault, { expiresAt: new Date(Date.now() - 1000).toISOString() });

    const connector = createGoogleWorkspaceConnector(CFG);
    const health = await connector.testConnection("cin_test1234", context);
    expect(health.healthy).toBe(true);
    expect(calls).toContain(GOOGLE_TOKEN_ENDPOINT);

    const tokens = JSON.parse((await vault.retrieve("cred_test1234"))!) as GoogleTokenSet;
    expect(tokens.accessToken).toBe("refreshed-access");
    expect(tokens.refreshToken).toBe("refresh-1"); // preserved when not rotated
    expect(new Date(tokens.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("search fans out to drive, gmail, and calendar and normalizes each", async () => {
    const { fetchImpl } = fakeGoogle();
    const { context, vault } = makeContext(fetchImpl);
    await seedTokens(vault, {});

    const connector = createGoogleWorkspaceConnector(CFG);
    const { items } = await connector.search({ query: "launch" }, context);
    const types = items.map((i) => i.type).sort();
    expect(types).toEqual(["document", "email", "event", "folder"]);
    const email = items.find((i) => i.type === "email")!;
    expect(email.title).toBe("Launch timing");
    expect(email.content).toBe("The launch moved to March 21.");
    expect(email.author?.email).toBe("kai@example.com");
    expect(email.externalId).toBe("gmail:m1");
    for (const item of items) {
      expect(item.organizationId).toBe("org_test1234");
      expect(item.installationId).toBe("cin_test1234");
    }
  });

  it("fetch routes by service prefix and exports google docs as text", async () => {
    const { fetchImpl } = fakeGoogle();
    const { context, vault } = makeContext(fetchImpl);
    await seedTokens(vault, {});
    const connector = createGoogleWorkspaceConnector(CFG);

    const doc = await connector.fetch({ externalId: "drive:f1" }, context);
    expect(doc.type).toBe("document");
    expect(doc.content).toBe("Exported doc text.");
    expect(doc.permissions.visibility).toBe("shared");

    const event = await connector.fetch({ externalId: "calendar:e1" }, context);
    expect(event.type).toBe("event");
    expect(event.content).toContain("2026-08-01");

    await expect(connector.fetch({ externalId: "unknown:x" }, context)).rejects.toThrow(
      /unknown google service/,
    );
  });

  it("retries once on 401 via refresh, then surfaces an unauthorized error", async () => {
    const unauthorizedOnce = { remaining: 1 };
    const { fetchImpl, calls } = fakeGoogle({ unauthorizedOnce });
    const { context, vault } = makeContext(fetchImpl);
    await seedTokens(vault, {});
    const connector = createGoogleWorkspaceConnector(CFG);

    // First call hits a 401, refreshes, retries, succeeds.
    const health = await connector.testConnection("cin_test1234", context);
    expect(health.healthy).toBe(true);
    expect(calls.filter((c) => c === GOOGLE_TOKEN_ENDPOINT)).toHaveLength(1);

    // Persistent 401s (refresh doesn't help) surface as unauthorized health.
    const alwaysUnauthorized = fakeGoogle({ unauthorizedOnce: { remaining: 99 } });
    const persistent = makeContext(alwaysUnauthorized.fetchImpl);
    await seedTokens(persistent.vault, {});
    const bad = await connector.testConnection("cin_test1234", persistent.context);
    expect(bad.healthy).toBe(false);
    expect(bad.detail).toMatch(/reconnect/);
  });

  it("fails closed when the credential is missing or revoked", async () => {
    const { fetchImpl } = fakeGoogle();
    const { context } = makeContext(fetchImpl); // nothing seeded in the vault
    const connector = createGoogleWorkspaceConnector(CFG);
    await expect(connector.search({ query: "x" }, context)).rejects.toThrow(ContinuumError);
    await expect(connector.search({ query: "x" }, context)).rejects.toThrow(/missing|revoked/);
  });
});
