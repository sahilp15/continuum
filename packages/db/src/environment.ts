import { assertSpaceAccess, type Actor } from "@continuum/auth";
import {
  newId,
  type ContextBundle,
  type ContextRequest,
  type PreflightResult,
  type Source,
  type Suggestion,
} from "@continuum/contracts";
import { createContextCompiler } from "@continuum/context";
import { createMemoryService, extractCandidates } from "@continuum/memory";
import { runPreflight } from "@continuum/preflight";
import type { ContinuumDatabase } from "./client.js";
import { createDbAuditSink } from "./audit.js";
import { createTenancyRepository } from "./repositories/tenancy.js";
import { contextBundleItems, contextBundles, contextRequests } from "./schema/index.js";
import { createDrizzleAuthStore } from "./stores/auth-store.js";
import { createDrizzleMemoryStore } from "./stores/memory-store.js";

export interface ImportSourceInput {
  organizationId: string;
  spaceId: string;
  kind: Source["kind"];
  title: string;
  content: string;
  externalUrl?: string | null;
  authority?: Source["authority"];
  sensitivity?: Source["sensitivity"];
}

export interface ImportSourceResult {
  source: Source;
  suggestions: Suggestion[];
  injectionSuspected: boolean;
}

/**
 * A fully wired, DB-backed Continuum environment — the production counterpart to
 * `createDemoEnvironment` (`@continuum/evals`). Same storage-agnostic services
 * (`createMemoryService`, `createContextCompiler`, `runPreflight`), backed by
 * Drizzle stores so every write persists and Space isolation holds at the store.
 */
export function createDbEnvironment(db: ContinuumDatabase, now: () => Date = () => new Date()) {
  const store = createDrizzleMemoryStore(db);
  const authz = createDrizzleAuthStore(db);
  const audit = createDbAuditSink(db);
  const tenancy = createTenancyRepository(db);
  const memoryService = createMemoryService({ store, authz, audit, now });
  const compiler = createContextCompiler({
    store,
    authz,
    getSpace: (id) => tenancy.getSpace(id),
    getProject: (id) => tenancy.getProject(id),
    getProfile: (userId) => tenancy.getProfile(userId),
    audit,
    now,
  });

  return {
    db,
    store,
    authz,
    audit,
    tenancy,
    memoryService,
    compiler,

    /** Run deterministic preflight for a Space (authorization-checked). */
    async preflight(actor: Actor, spaceId: string, content: string): Promise<PreflightResult> {
      await assertSpaceAccess(authz, actor, spaceId);
      const space = await tenancy.getSpace(spaceId);
      if (!space) throw new Error("unknown space");
      const memories = await store.listSpaceMemories(spaceId);
      const others = (await tenancy.listUserSpaces(actor.userId))
        .filter((s) => s.id !== spaceId)
        .map((s) => s.name);
      return runPreflight({ space, memories, otherSpaceNames: others, content, now: now() });
    },

    /**
     * Import a source (text/upload/url) and extract candidate memories. Imported
     * text is DATA: extraction only ever produces `pending` suggestions for
     * review — there is no path from source content to approved memory.
     */
    async importSource(actor: Actor, input: ImportSourceInput): Promise<ImportSourceResult> {
      await assertSpaceAccess(authz, actor, input.spaceId);
      const timestamp = now().toISOString();
      const source: Source = {
        id: newId("src"),
        organizationId: input.organizationId,
        spaceId: input.spaceId,
        kind: input.kind,
        title: input.title,
        content: input.content,
        externalUrl: input.externalUrl ?? null,
        connectorInstallationId: null,
        authority: input.authority ?? "user_approved_document",
        sensitivity: input.sensitivity ?? "internal",
        contentHash: null,
        importedBy: actor.userId,
        createdAt: timestamp,
        deletedAt: null,
      };
      await store.insertSource(source);
      audit.record({
        actorId: actor.userId,
        action: "source.import",
        resourceType: "source",
        resourceId: source.id,
        detail: { organizationId: source.organizationId, spaceId: source.spaceId },
      });

      const existing = await store.listSpaceMemories(input.spaceId);
      const { suggestions, injectionSuspected } = extractCandidates(source, existing, now());
      for (const suggestion of suggestions) {
        await store.insertSuggestion(suggestion);
      }
      return { source, suggestions, injectionSuspected };
    },

    /**
     * Compile a context bundle AND persist the request + bundle (+ items) so the
     * dashboard's "recent context activity" reflects real generations.
     */
    async generateContext(actor: Actor, request: ContextRequest): Promise<ContextBundle> {
      const bundle = await compiler.compile(actor, request); // authorizes + audits
      const space = await tenancy.getSpace(request.spaceId);
      if (!space) return bundle; // unreachable after compile; skip persistence defensively
      try {
        const requestId = newId("crq");
        await db.insert(contextRequests).values({
          id: requestId,
          organizationId: space.organizationId,
          spaceId: request.spaceId,
          projectId: request.projectId ?? null,
          requestingIntegration: request.requestingIntegration,
          actorId: actor.userId,
          taskDescription: request.taskDescription ?? "",
          query: request.query ?? "",
          tokenBudget: request.tokenBudget ?? 4000,
        });
        await db.insert(contextBundles).values({
          id: bundle.id,
          requestId,
          renderedText: bundle.renderedText,
          receipt: bundle.receipt as unknown as Record<string, unknown>,
          totalEstimatedTokens: bundle.receipt.totalEstimatedTokens,
        });
        if (bundle.items.length > 0) {
          await db.insert(contextBundleItems).values(
            bundle.items.map((item) => ({
              id: newId("cbi"),
              bundleId: bundle.id,
              memoryId: item.memoryId,
              layer: item.layer,
              reason: item.reason,
              estimatedTokens: item.estimatedTokens,
            })),
          );
        }
      } catch {
        // Persistence of the activity record must never fail the generation.
        console.warn("context bundle persistence failed");
      }
      return bundle;
    },
  };
}

export type DbEnvironment = ReturnType<typeof createDbEnvironment>;
