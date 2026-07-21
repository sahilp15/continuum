import {
  ContinuumError,
  memoryDraftSchema,
  memorySchema,
  newId,
  notFound,
  type Memory,
  type MemoryDraft,
  type Suggestion,
} from "@continuum/contracts";
import {
  assertSpaceAccess,
  canApproveMemory,
  type Actor,
  type AuthorizationStore,
} from "@continuum/auth";
import type { MemoryStore } from "./store.js";

export interface AuditSink {
  record(event: {
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    detail?: Record<string, unknown>;
  }): void;
}

export interface MemoryServiceDeps {
  store: MemoryStore;
  authz: AuthorizationStore;
  audit: AuditSink;
  now?: () => Date;
}

/**
 * Memory lifecycle service (spec §10–11). All writes are actor-authorized,
 * audited, and reversible. Approved memory is never silently overwritten:
 * changes flow through proposals and explicit approval.
 */
export function createMemoryService(deps: MemoryServiceDeps) {
  const now = deps.now ?? (() => new Date());

  async function requireApprovalRights(actor: Actor, spaceId: string): Promise<void> {
    await assertSpaceAccess(deps.authz, actor, spaceId);
    if (!(await canApproveMemory(deps.authz, actor, spaceId))) {
      throw new ContinuumError("forbidden", "actor cannot approve memory in this space");
    }
  }

  async function getAuthorized(actor: Actor, memoryId: string): Promise<Memory> {
    const memory = await deps.store.getMemory(memoryId);
    // Identical error for missing and unauthorized memories (spec §25.5).
    if (!memory) throw notFound("memory");
    await assertSpaceAccess(deps.authz, actor, memory.spaceId);
    return memory;
  }

  return {
    /** Create a `proposed` memory. Nothing becomes canonical without approval. */
    async propose(actor: Actor, draft: MemoryDraft): Promise<Memory> {
      const parsed = memoryDraftSchema.parse(draft);
      await assertSpaceAccess(deps.authz, actor, parsed.spaceId);
      const timestamp = now().toISOString();
      const memory = memorySchema.parse({
        ...parsed,
        id: newId("mem"),
        status: "proposed",
        approvedBy: null,
        approvedAt: null,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      });
      await deps.store.insertMemory(memory);
      deps.audit.record({
        actorId: actor.userId,
        action: "memory.propose",
        resourceType: "memory",
        resourceId: memory.id,
        detail: { spaceId: memory.spaceId, type: memory.type },
      });
      return memory;
    },

    async approve(actor: Actor, memoryId: string): Promise<Memory> {
      const memory = await getAuthorized(actor, memoryId);
      await requireApprovalRights(actor, memory.spaceId);
      if (memory.status !== "proposed") {
        throw new ContinuumError("conflict", `cannot approve memory in status ${memory.status}`);
      }
      const timestamp = now().toISOString();
      const approved: Memory = {
        ...memory,
        status: "approved",
        approvedBy: actor.userId,
        approvedAt: timestamp,
        updatedAt: timestamp,
        version: memory.version + 1,
      };
      await deps.store.updateMemory(approved);

      // Approving a replacement marks the older memory superseded — an
      // explicit, audited transition, never a silent overwrite (spec §11).
      if (approved.supersedesMemoryId) {
        const older = await deps.store.getMemory(approved.supersedesMemoryId);
        if (older && older.spaceId === approved.spaceId && older.status === "approved") {
          await deps.store.updateMemory({
            ...older,
            status: "superseded",
            updatedAt: timestamp,
            version: older.version + 1,
          });
          deps.audit.record({
            actorId: actor.userId,
            action: "memory.supersede",
            resourceType: "memory",
            resourceId: older.id,
            detail: { supersededBy: approved.id },
          });
        }
      }

      deps.audit.record({
        actorId: actor.userId,
        action: "memory.approve",
        resourceType: "memory",
        resourceId: approved.id,
      });
      return approved;
    },

    async reject(actor: Actor, memoryId: string): Promise<Memory> {
      const memory = await getAuthorized(actor, memoryId);
      await requireApprovalRights(actor, memory.spaceId);
      const updated: Memory = {
        ...memory,
        status: "rejected",
        updatedAt: now().toISOString(),
        version: memory.version + 1,
      };
      await deps.store.updateMemory(updated);
      deps.audit.record({
        actorId: actor.userId,
        action: "memory.reject",
        resourceType: "memory",
        resourceId: memory.id,
      });
      return updated;
    },

    /** Soft-delete ("forget"). Verified permanent purge is a governance flow. */
    async forget(actor: Actor, memoryId: string): Promise<Memory> {
      const memory = await getAuthorized(actor, memoryId);
      await requireApprovalRights(actor, memory.spaceId);
      const timestamp = now().toISOString();
      const updated: Memory = {
        ...memory,
        status: "deleted",
        deletedAt: timestamp,
        updatedAt: timestamp,
        version: memory.version + 1,
      };
      await deps.store.updateMemory(updated);
      deps.audit.record({
        actorId: actor.userId,
        action: "memory.forget",
        resourceType: "memory",
        resourceId: memory.id,
      });
      return updated;
    },

    async listSpaceMemories(actor: Actor, spaceId: string): Promise<Memory[]> {
      await assertSpaceAccess(deps.authz, actor, spaceId);
      return deps.store.listSpaceMemories(spaceId);
    },

    async listSuggestions(actor: Actor, spaceId: string): Promise<Suggestion[]> {
      await assertSpaceAccess(deps.authz, actor, spaceId);
      return deps.store.listSpaceSuggestions(spaceId, "pending");
    },

    /**
     * Resolve a pending suggestion (spec §11). Accepting creates an approved
     * memory; when the suggestion conflicts with existing approved memory the
     * older memory is superseded as part of the same audited transition.
     */
    async resolveSuggestion(
      actor: Actor,
      suggestionId: string,
      resolution:
        | { action: "accept"; editedText?: string }
        | { action: "reject" }
        | { action: "keep_temporary" },
    ): Promise<{ suggestion: Suggestion; memory: Memory | null }> {
      const suggestion = await deps.store.getSuggestion(suggestionId);
      if (!suggestion) throw notFound("suggestion");
      await assertSpaceAccess(deps.authz, actor, suggestion.spaceId);
      if (suggestion.status !== "pending") {
        throw new ContinuumError("conflict", "suggestion already resolved");
      }
      const timestamp = now().toISOString();

      if (resolution.action === "reject" || resolution.action === "keep_temporary") {
        const resolved: Suggestion = {
          ...suggestion,
          status: resolution.action === "reject" ? "rejected" : "kept_temporary",
          resolvedAt: timestamp,
          resolvedBy: actor.userId,
        };
        await deps.store.updateSuggestion(resolved);
        deps.audit.record({
          actorId: actor.userId,
          action: `suggestion.${resolution.action}`,
          resourceType: "suggestion",
          resourceId: suggestion.id,
        });
        return { suggestion: resolved, memory: null };
      }

      await requireApprovalRights(actor, suggestion.spaceId);
      const text = resolution.editedText?.trim() || suggestion.proposedText;
      const proposed = await this.propose(actor, {
        organizationId: suggestion.organizationId,
        spaceId: suggestion.spaceId,
        projectId: suggestion.projectId,
        type: suggestion.memoryType,
        title: suggestion.title,
        canonicalText: text,
        structuredValue: suggestion.structuredValue,
        supersedesMemoryId: suggestion.conflictsWithMemoryId,
        sourceIds: suggestion.sourceId ? [suggestion.sourceId] : [],
        confidence: suggestion.confidence,
        createdBy: actor.userId,
      });
      const memory = await this.approve(actor, proposed.id);
      const resolved: Suggestion = {
        ...suggestion,
        status: resolution.editedText ? "edited" : "accepted",
        resolvedAt: timestamp,
        resolvedBy: actor.userId,
      };
      await deps.store.updateSuggestion(resolved);
      deps.audit.record({
        actorId: actor.userId,
        action: "suggestion.accept",
        resourceType: "suggestion",
        resourceId: suggestion.id,
        detail: { memoryId: memory.id },
      });
      return { suggestion: resolved, memory };
    },
  };
}

export type MemoryService = ReturnType<typeof createMemoryService>;

/** In-memory audit sink for tests and local mode. */
export function createRecordingAuditSink(): AuditSink & {
  events: Array<{ actorId: string; action: string; resourceType: string; resourceId: string }>;
} {
  const events: Array<{
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
  }> = [];
  return {
    events,
    record(event) {
      events.push(event);
    },
  };
}
