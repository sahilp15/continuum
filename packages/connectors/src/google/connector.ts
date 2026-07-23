import type {
  ConnectorExecutionContext,
  ConnectorSearchInput,
  ConnectorSearchResult,
  ContinuumConnector,
} from "@continuum/connectors-core";
import { ContinuumError, type NormalizedExternalItem } from "@continuum/contracts";
import { googleWorkspaceManifest } from "./manifest.js";
import {
  exchangeCode,
  refreshAccessToken,
  revokeGoogleToken,
  type GoogleOAuthConfig,
  type GoogleTokenSet,
} from "./oauth.js";
import {
  calendarEventToItem,
  driveFileToItem,
  gmailMessageToItem,
  type CalendarEvent,
  type DriveFile,
  type GmailMessage,
  type NormalizeContext,
} from "./normalize.js";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/**
 * The REAL Google Workspace connector: Drive + Gmail + Calendar, readonly, one
 * OAuth authorization. All HTTP flows through `context.fetchImpl ?? fetch`
 * (unit-testable against mocked HTTP), the token set lives ONLY sealed in the
 * credential vault, and the access token refreshes lazily before use. This is
 * the connector app's OAuth — never the login provider's token.
 */
export function createGoogleWorkspaceConnector(cfg: GoogleOAuthConfig): ContinuumConnector {
  function fetcher(context: ConnectorExecutionContext): typeof fetch {
    return context.fetchImpl ?? fetch;
  }

  function credentialRef(context: ConnectorExecutionContext): string {
    const ref = context.installation.credentialRef;
    if (!ref) {
      throw new ContinuumError("unauthorized", "google installation has no stored credential");
    }
    return ref;
  }

  async function loadTokens(context: ConnectorExecutionContext): Promise<GoogleTokenSet> {
    const sealed = await context.vault.retrieve(credentialRef(context));
    if (!sealed) {
      throw new ContinuumError("unauthorized", "google credential is missing or was revoked");
    }
    return JSON.parse(sealed) as GoogleTokenSet;
  }

  /** Return a fresh access token, refreshing + re-sealing when near expiry. */
  async function ensureAccessToken(context: ConnectorExecutionContext): Promise<string> {
    let tokens = await loadTokens(context);
    const expiresSoon = new Date(tokens.expiresAt).getTime() - Date.now() < 60_000;
    if (expiresSoon) {
      if (!tokens.refreshToken) {
        throw new ContinuumError(
          "unauthorized",
          "google access expired and no refresh token is available — reconnect the connector",
        );
      }
      tokens = await refreshAccessToken(cfg, tokens.refreshToken, fetcher(context));
      await context.vault.store(credentialRef(context), JSON.stringify(tokens));
      context.logger.info("google access token refreshed", { keyVersionNote: "re-sealed" });
    }
    return tokens.accessToken;
  }

  /** Authorized GET returning parsed JSON. 401 → one refresh retry, then fail. */
  async function apiGet<T>(
    context: ConnectorExecutionContext,
    url: string,
    retried = false,
  ): Promise<T> {
    const token = await ensureAccessToken(context);
    const response = await fetcher(context)(url, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 401 && !retried) {
      // Force-expire so ensureAccessToken refreshes, then retry once.
      const tokens = await loadTokens(context);
      await context.vault.store(
        credentialRef(context),
        JSON.stringify({ ...tokens, expiresAt: new Date(0).toISOString() }),
      );
      return apiGet<T>(context, url, true);
    }
    if (response.status === 401 || response.status === 403) {
      throw new ContinuumError(
        "unauthorized",
        "google rejected the connector's authorization — reconnect to grant access again",
      );
    }
    if (response.status === 429) {
      throw new ContinuumError("rate_limited", "google api rate limit reached — try again soon");
    }
    if (!response.ok) {
      throw new ContinuumError("connector_unavailable", `google api error (${response.status})`);
    }
    return (await response.json()) as T;
  }

  function normalizeCtx(context: ConnectorExecutionContext): NormalizeContext {
    return {
      organizationId: context.organizationId,
      spaceId: context.spaceId,
      installationId: context.installation.id,
    };
  }

  // ---------- per-service search ----------

  async function searchDrive(
    context: ConnectorExecutionContext,
    query: string,
    limit: number,
  ): Promise<NormalizedExternalItem[]> {
    const q = encodeURIComponent(`fullText contains '${query.replace(/'/g, "\\'")}'`);
    const fields = encodeURIComponent(
      "files(id,name,mimeType,description,webViewLink,modifiedTime,createdTime,shared,owners(displayName,emailAddress))",
    );
    const data = await apiGet<{ files?: DriveFile[] }>(
      context,
      `${DRIVE_API}/files?q=${q}&pageSize=${limit}&fields=${fields}`,
    );
    return (data.files ?? []).map((f) => driveFileToItem(f, normalizeCtx(context)));
  }

  async function searchGmail(
    context: ConnectorExecutionContext,
    query: string,
    limit: number,
  ): Promise<NormalizedExternalItem[]> {
    const list = await apiGet<{ messages?: Array<{ id: string }> }>(
      context,
      `${GMAIL_API}/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${limit}`,
    );
    const ids = (list.messages ?? []).slice(0, limit).map((m) => m.id);
    const messages = await Promise.all(
      ids.map((id) =>
        apiGet<GmailMessage>(context, `${GMAIL_API}/users/me/messages/${id}?format=full`),
      ),
    );
    return messages.map((m) => gmailMessageToItem(m, normalizeCtx(context)));
  }

  async function searchCalendar(
    context: ConnectorExecutionContext,
    query: string,
    limit: number,
  ): Promise<NormalizedExternalItem[]> {
    const data = await apiGet<{ items?: CalendarEvent[] }>(
      context,
      `${CALENDAR_API}/calendars/primary/events?q=${encodeURIComponent(query)}&maxResults=${limit}&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString())}`,
    );
    return (data.items ?? []).map((e) => calendarEventToItem(e, normalizeCtx(context)));
  }

  return {
    manifest: googleWorkspaceManifest,

    /** Exchange the authorization code and seal the token set into the vault at
     *  the Gateway-provisioned credential ref. */
    async connect(input, context) {
      if (!input.credential) {
        throw new ContinuumError("invalid_input", "google connect requires an authorization code");
      }
      const tokens = await exchangeCode(cfg, input.credential, fetcher(context));
      await context.vault.store(credentialRef(context), JSON.stringify(tokens));
      context.logger.info("google workspace connected", {
        scopes: tokens.scope.split(" ").length,
      });
      return {
        installationId: context.installation.id,
        status: "connected" as const,
        grantedScopes: tokens.scope ? tokens.scope.split(" ") : [],
      };
    },

    /** Best-effort revoke at Google; the Gateway destroys the vault entry. */
    async disconnect(_installationId, context) {
      try {
        const tokens = await loadTokens(context);
        await revokeGoogleToken(tokens.refreshToken ?? tokens.accessToken, fetcher(context));
      } catch {
        // Credential already gone — vault destruction is the real revocation.
      }
    },

    async testConnection(_installationId, context) {
      try {
        await apiGet<{ user?: unknown }>(context, `${DRIVE_API}/about?fields=user`);
        return {
          healthy: true,
          detail: "google api reachable",
          checkedAt: new Date().toISOString(),
        };
      } catch (error) {
        return {
          healthy: false,
          detail: error instanceof Error ? error.message : "google api unreachable",
          checkedAt: new Date().toISOString(),
        };
      }
    },

    /** Fan-out live search across Drive, Gmail, and Calendar (readonly). */
    async search(
      input: ConnectorSearchInput,
      context: ConnectorExecutionContext,
    ): Promise<ConnectorSearchResult> {
      const limit = Math.min(input.limit ?? 10, 25);
      const wants = (type: string) => !input.entityTypes || input.entityTypes.includes(type);
      const jobs: Array<Promise<NormalizedExternalItem[]>> = [];
      if (wants("document") || wants("folder")) jobs.push(searchDrive(context, input.query, limit));
      if (wants("email")) jobs.push(searchGmail(context, input.query, limit));
      if (wants("event")) jobs.push(searchCalendar(context, input.query, limit));
      const results = await Promise.all(jobs);
      const items = results.flat().slice(0, limit * 3);
      return { items, truncated: results.some((r) => r.length >= limit) };
    },

    /** Fetch one item by service-prefixed external id (drive:/gmail:/calendar:). */
    async fetch(input, context) {
      const [service, ...rest] = input.externalId.split(":");
      const id = rest.join(":");
      if (!id) throw new ContinuumError("invalid_input", "malformed google external id");
      if (service === "drive") {
        const fields = encodeURIComponent(
          "id,name,mimeType,description,webViewLink,modifiedTime,createdTime,shared,owners(displayName,emailAddress)",
        );
        const file = await apiGet<DriveFile>(
          context,
          `${DRIVE_API}/files/${encodeURIComponent(id)}?fields=${fields}`,
        );
        let content = "";
        if (file.mimeType?.startsWith("application/vnd.google-apps")) {
          // Google Docs/Sheets/Slides export as plain text (readonly).
          const token = await ensureAccessToken(context);
          const exported = await fetcher(context)(
            `${DRIVE_API}/files/${encodeURIComponent(id)}/export?mimeType=text/plain`,
            { headers: { authorization: `Bearer ${token}` } },
          );
          if (exported.ok) content = await exported.text();
        }
        return driveFileToItem(file, normalizeCtx(context), content);
      }
      if (service === "gmail") {
        const message = await apiGet<GmailMessage>(
          context,
          `${GMAIL_API}/users/me/messages/${encodeURIComponent(id)}?format=full`,
        );
        return gmailMessageToItem(message, normalizeCtx(context));
      }
      if (service === "calendar") {
        const event = await apiGet<CalendarEvent>(
          context,
          `${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(id)}`,
        );
        return calendarEventToItem(event, normalizeCtx(context));
      }
      throw new ContinuumError("invalid_input", `unknown google service '${service ?? ""}'`);
    },
  };
}
