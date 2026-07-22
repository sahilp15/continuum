import { newId } from "@continuum/contracts";
import { eq } from "drizzle-orm";
import type { ContinuumDatabase } from "./client.js";
import { auditEvents, memories, projects, sources, spaces, suggestions } from "./schema/index.js";

/**
 * Structural audit sink shape shared by the memory service and context compiler
 * (both call `record(event)`), kept loose so one sink satisfies both.
 */
export interface DbAuditSink {
  record(event: Record<string, unknown>): void;
}

const asString = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

/**
 * Audit sink that persists to `audit_events` for the dashboard activity feed.
 * Writes are fire-and-forget (the `record` contract is synchronous/void) and
 * never throw. The organization is resolved from the referenced resource so
 * every row is tenant-scoped. **Never logs the event payload** (may reference
 * sensitive detail); only a generic warning on failure.
 */
export function createDbAuditSink(db: ContinuumDatabase): DbAuditSink {
  async function resolveOrganizationId(
    resourceType: string,
    resourceId: string,
    detail: Record<string, unknown>,
  ): Promise<string | null> {
    if (typeof detail.organizationId === "string") return detail.organizationId;
    if (!resourceId) return null;
    try {
      switch (resourceType) {
        case "memory": {
          const r = await db
            .select({ o: memories.organizationId })
            .from(memories)
            .where(eq(memories.id, resourceId))
            .limit(1);
          return r[0]?.o ?? null;
        }
        case "suggestion": {
          const r = await db
            .select({ o: suggestions.organizationId })
            .from(suggestions)
            .where(eq(suggestions.id, resourceId))
            .limit(1);
          return r[0]?.o ?? null;
        }
        case "space": {
          const r = await db
            .select({ o: spaces.organizationId })
            .from(spaces)
            .where(eq(spaces.id, resourceId))
            .limit(1);
          return r[0]?.o ?? null;
        }
        case "project": {
          const r = await db
            .select({ o: projects.organizationId })
            .from(projects)
            .where(eq(projects.id, resourceId))
            .limit(1);
          return r[0]?.o ?? null;
        }
        case "source": {
          const r = await db
            .select({ o: sources.organizationId })
            .from(sources)
            .where(eq(sources.id, resourceId))
            .limit(1);
          return r[0]?.o ?? null;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  return {
    record(event: Record<string, unknown>): void {
      const actorId = asString(event.actorId, "system");
      const action = asString(event.action, "unknown");
      const resourceType = asString(event.resourceType);
      const resourceId = asString(event.resourceId);
      const detail =
        event.detail && typeof event.detail === "object"
          ? (event.detail as Record<string, unknown>)
          : {};

      void (async () => {
        try {
          const organizationId = await resolveOrganizationId(resourceType, resourceId, detail);
          if (!organizationId) return; // cannot attribute to a tenant — skip safely
          await db.insert(auditEvents).values({
            id: newId("aud"),
            organizationId,
            actorId,
            action,
            resourceType,
            resourceId,
            detail,
          });
        } catch {
          // Fire-and-forget: never throw from an audit write, never log the payload.
          console.warn("audit event write failed");
        }
      })();
    },
  };
}
