import {
  newId,
  normalizedExternalItemSchema,
  type NormalizedExternalItem,
} from "@continuum/contracts";

/**
 * Normalization: raw Google API payloads → `NormalizedExternalItem`. External
 * ids are service-prefixed (`drive:…` / `gmail:…` / `calendar:…`) so one
 * installation can route fetches across the three services. Every mapper
 * validates through the contract schema — malformed provider data fails loudly
 * here, never downstream. Item text is untrusted DATA (extraction stays
 * injection-safe and pending-only).
 */

export interface NormalizeContext {
  organizationId: string;
  spaceId: string | null;
  installationId: string;
}

const base = (ctx: NormalizeContext) => ({
  id: newId("ext"),
  organizationId: ctx.organizationId,
  ...(ctx.spaceId ? { spaceId: ctx.spaceId } : {}),
  connectorId: "google-workspace",
  installationId: ctx.installationId,
});

// ---------- Drive ----------

export interface DriveFile {
  id: string;
  name?: string;
  mimeType?: string;
  description?: string;
  webViewLink?: string;
  modifiedTime?: string;
  createdTime?: string;
  shared?: boolean;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
}

export function driveFileToItem(
  file: DriveFile,
  ctx: NormalizeContext,
  content = "",
): NormalizedExternalItem {
  const isFolder = file.mimeType === "application/vnd.google-apps.folder";
  const owner = file.owners?.[0];
  return normalizedExternalItemSchema.parse({
    ...base(ctx),
    externalId: `drive:${file.id}`,
    type: isFolder ? "folder" : "document",
    title: file.name ?? file.id,
    content: content || (file.description ?? ""),
    ...(owner ? { author: { name: owner.displayName, email: owner.emailAddress } } : {}),
    ...(file.webViewLink ? { externalUrl: file.webViewLink } : {}),
    ...(file.mimeType ? { mimeType: file.mimeType } : {}),
    ...(file.createdTime ? { createdAt: file.createdTime } : {}),
    ...(file.modifiedTime ? { updatedAt: file.modifiedTime } : {}),
    permissions: { visibility: file.shared ? "shared" : "private", allowedEmails: [] },
    sensitivity: "internal",
    metadata: { service: "drive" },
  });
}

// ---------- Gmail ----------

export interface GmailMessage {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    mimeType?: string;
    headers?: Array<{ name?: string; value?: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
  };
}

function header(message: GmailMessage, name: string): string | undefined {
  return message.payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;
}

function decodeBase64Url(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

/** Extract the plain-text body (first text/plain part, else the flat body). */
export function gmailBodyText(message: GmailMessage): string {
  const flat = message.payload?.body?.data;
  if (message.payload?.mimeType === "text/plain" && flat) return decodeBase64Url(flat);
  const part = message.payload?.parts?.find((p) => p.mimeType === "text/plain");
  if (part?.body?.data) return decodeBase64Url(part.body.data);
  if (flat) return decodeBase64Url(flat);
  return message.snippet ?? "";
}

function parseAddress(raw: string | undefined): { name?: string; email?: string } | null {
  if (!raw) return null;
  const match = /^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/.exec(raw);
  if (match) {
    const name = match[1]?.trim();
    return { ...(name ? { name } : {}), email: match[2]!.trim() };
  }
  return raw.includes("@") ? { email: raw.trim() } : { name: raw.trim() };
}

export function gmailMessageToItem(
  message: GmailMessage,
  ctx: NormalizeContext,
): NormalizedExternalItem {
  const from = parseAddress(header(message, "From"));
  const date = message.internalDate ? new Date(Number(message.internalDate)) : null;
  return normalizedExternalItemSchema.parse({
    ...base(ctx),
    externalId: `gmail:${message.id}`,
    ...(message.threadId ? { externalParentId: `gmail-thread:${message.threadId}` } : {}),
    type: "email",
    title: header(message, "Subject") ?? "(no subject)",
    content: gmailBodyText(message),
    ...(from ? { author: from } : {}),
    ...(date && !Number.isNaN(date.getTime()) ? { createdAt: date.toISOString() } : {}),
    permissions: { visibility: "private", allowedEmails: [] },
    sensitivity: "internal",
    metadata: { service: "gmail" },
  });
}

// ---------- Calendar ----------

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  updated?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  organizer?: { displayName?: string; email?: string };
  attendees?: Array<{ displayName?: string; email?: string }>;
}

export function calendarEventToItem(
  event: CalendarEvent,
  ctx: NormalizeContext,
): NormalizedExternalItem {
  const start = event.start?.dateTime ?? event.start?.date ?? "";
  const end = event.end?.dateTime ?? event.end?.date ?? "";
  const attendees = (event.attendees ?? [])
    .map((a) => a.displayName || a.email)
    .filter(Boolean)
    .join(", ");
  const lines = [
    event.description ?? "",
    start ? `When: ${start}${end ? ` → ${end}` : ""}` : "",
    attendees ? `Attendees: ${attendees}` : "",
  ].filter(Boolean);
  return normalizedExternalItemSchema.parse({
    ...base(ctx),
    externalId: `calendar:${event.id}`,
    type: "event",
    title: event.summary ?? "(untitled event)",
    content: lines.join("\n"),
    ...(event.organizer
      ? { author: { name: event.organizer.displayName, email: event.organizer.email } }
      : {}),
    ...(event.htmlLink ? { externalUrl: event.htmlLink } : {}),
    ...(event.updated ? { updatedAt: event.updated } : {}),
    permissions: {
      visibility: (event.attendees?.length ?? 0) > 0 ? "shared" : "private",
      allowedEmails: [],
    },
    sensitivity: "internal",
    metadata: { service: "calendar" },
  });
}
