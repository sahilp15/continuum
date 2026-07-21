import {
  contextRequestSchema,
  newId,
  precedenceRank,
  sensitivityRank,
  type ContextBundle,
  type ContextExclusion,
  type ContextItem,
  type ContextRequest,
  type Memory,
  type PersonalProfile,
  type Project,
  type Space,
} from "@continuum/contracts";
import {
  assertProjectInSpace,
  assertSpaceAccess,
  type Actor,
  type AuthorizationStore,
} from "@continuum/auth";
import { inactiveReason, isMemoryActive, type MemoryStore } from "@continuum/memory";
import { estimateTokens, layerForMemory } from "./layering.js";

export interface ContextCompilerDeps {
  store: MemoryStore;
  authz: AuthorizationStore;
  /** Space + project metadata lookups, already authorization-agnostic. */
  getSpace(spaceId: string): Promise<Space | null>;
  getProject(projectId: string): Promise<Project | null>;
  getProfile(userId: string): Promise<PersonalProfile | null>;
  audit: { record(event: Record<string, unknown>): void };
  now?: () => Date;
}

/** Simple lexical relevance: term overlap between the task/query and a memory. */
function relevanceScore(memory: Memory, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 0;
  const haystack = `${memory.title} ${memory.canonicalText}`.toLowerCase();
  let score = 0;
  for (const term of queryTerms) {
    if (haystack.includes(term)) score += Math.max(1, term.length / 4);
  }
  return score;
}

/**
 * The ContextCompiler (spec §12). Order of operations is security-first:
 * authorization and Space scoping happen BEFORE any retrieval; ranking and
 * budgeting happen last. The goal is the smallest trustworthy package.
 */
export function createContextCompiler(deps: ContextCompilerDeps) {
  const now = deps.now ?? (() => new Date());

  return {
    async compile(actor: Actor, rawRequest: ContextRequest): Promise<ContextBundle> {
      const request = contextRequestSchema.parse(rawRequest);
      const currentTime = now();

      // 1–4. Authenticate + authorize before touching any data.
      await assertSpaceAccess(deps.authz, actor, request.spaceId);
      if (request.projectId) {
        await assertProjectInSpace(deps.authz, actor, request.projectId, request.spaceId);
      }
      const space = await deps.getSpace(request.spaceId);
      if (!space) {
        // Should be unreachable after assertSpaceAccess; defense in depth.
        throw new Error("space lookup failed after authorization");
      }
      const project = request.projectId ? await deps.getProject(request.projectId) : null;

      // 5. Retrieval is Space-scoped at the store level — there is no global
      // query to filter afterward (spec §25.3).
      const spaceMemories = await deps.store.listSpaceMemories(request.spaceId);

      const exclusions: ContextExclusion[] = [];
      const active: Memory[] = [];
      for (const memory of spaceMemories) {
        const reason = inactiveReason(memory, currentTime);
        if (reason) {
          exclusions.push({
            memoryId: memory.id,
            title: memory.title,
            reason,
            detail: `status=${memory.status}`,
          });
          continue;
        }
        if (!isMemoryActive(memory, currentTime)) continue;
        // 12. Sensitivity allowance of the requesting surface.
        if (sensitivityRank(memory.sensitivity) > sensitivityRank(request.sensitivityAllowance)) {
          exclusions.push({
            memoryId: memory.id,
            title: memory.title,
            reason: "sensitivity_blocked",
            detail: `memory=${memory.sensitivity} allowance=${request.sensitivityAllowance}`,
          });
          continue;
        }
        // Project-scoped memory from *other* projects is out of scope.
        if (memory.projectId && request.projectId && memory.projectId !== request.projectId) {
          exclusions.push({
            memoryId: memory.id,
            title: memory.title,
            reason: "not_relevant",
            detail: "belongs to a different project",
          });
          continue;
        }
        active.push(memory);
      }

      // Personal Profile preferences ride along at the lowest binding layer.
      const profile = await deps.getProfile(actor.userId);

      const queryTerms = `${request.taskDescription} ${request.query}`
        .toLowerCase()
        .split(/\W+/)
        .filter((t) => t.length > 2);

      // 13. Contradiction detection among active memories.
      for (const memory of active) {
        for (const contradictedId of memory.contradictsMemoryIds) {
          const other = active.find((m) => m.id === contradictedId);
          if (other) {
            exclusions.push({
              memoryId: other.id,
              title: other.title,
              reason: "conflict_loser",
              detail: `contradicted by ${memory.id}`,
            });
          }
        }
      }
      const contradictionLosers = new Set(
        exclusions.filter((e) => e.reason === "conflict_loser").map((e) => e.memoryId),
      );

      // 15. Rank: precedence layer first, then priority, relevance, recency.
      const ranked = active
        .filter((m) => !contradictionLosers.has(m.id))
        .map((memory) => ({
          memory,
          layer: layerForMemory(memory),
          relevance: relevanceScore(memory, queryTerms),
        }))
        .sort((a, b) => {
          const layerDiff = precedenceRank(a.layer) - precedenceRank(b.layer);
          if (layerDiff !== 0) return layerDiff;
          const priorityDiff = a.memory.priority - b.memory.priority;
          if (priorityDiff !== 0) return priorityDiff;
          const relevanceDiff = b.relevance - a.relevance;
          if (relevanceDiff !== 0) return relevanceDiff;
          return b.memory.updatedAt.localeCompare(a.memory.updatedAt);
        });

      // 16. Budget fit. Rules and project facts are never dropped for budget;
      // examples and low-relevance facts go first.
      const items: ContextItem[] = [];
      let usedTokens = 0;
      for (const { memory, layer, relevance } of ranked) {
        const text = memory.canonicalText;
        const cost = estimateTokens(text);
        const mandatory =
          layer === "space_compliance_rule" ||
          layer === "space_hard_rule" ||
          layer === "project_fact";
        // Historical examples must earn their place via relevance.
        if (layer === "historical_example" && relevance === 0 && queryTerms.length > 0) {
          exclusions.push({
            memoryId: memory.id,
            title: memory.title,
            reason: "not_relevant",
            detail: "example did not match the task",
          });
          continue;
        }
        if (!mandatory && usedTokens + cost > request.tokenBudget) {
          exclusions.push({
            memoryId: memory.id,
            title: memory.title,
            reason: "budget_exceeded",
            detail: `cost=${cost}`,
          });
          continue;
        }
        usedTokens += cost;
        items.push({
          memoryId: memory.id,
          layer,
          title: memory.title,
          text,
          reason: mandatory
            ? "always included: binding rule or current project fact"
            : relevance > 0
              ? "matched the task"
              : "core space profile",
          sourceIds: memory.sourceIds,
          estimatedTokens: cost,
        });
      }

      // Personal preferences are appended only if the budget allows and are
      // explicitly labeled as the lowest-precedence layer.
      const personalItems: ContextItem[] = [];
      if (profile) {
        for (const [index, preference] of profile.preferences.entries()) {
          const cost = estimateTokens(preference);
          if (usedTokens + cost > request.tokenBudget) break;
          usedTokens += cost;
          personalItems.push({
            memoryId: `mem_personal_pref_${index}`,
            layer: "personal_preference",
            title: "Personal preference",
            text: preference,
            reason: "personal profile preference (never overrides Space rules)",
            sourceIds: [],
            estimatedTokens: cost,
          });
        }
      }

      const bundleId = newId("ctx");
      const generatedAt = currentTime.toISOString();
      const byLayer = (...layers: string[]) => items.filter((i) => layers.includes(i.layer));

      const sourceIds = [...new Set(items.flatMap((i) => i.sourceIds))];
      const sources: Array<{ sourceId: string; title: string }> = [];
      for (const sourceId of sourceIds) {
        const source = await deps.store.getSource(sourceId);
        // Sources are already Space-scoped via their memories; skip anything odd.
        if (source && source.spaceId === request.spaceId) {
          sources.push({ sourceId, title: source.title });
        }
      }

      const receipt = {
        bundleId,
        spaceName: space.name,
        projectName: project?.name ?? null,
        requestingIntegration: request.requestingIntegration,
        generatedAt,
        rules: byLayer("space_compliance_rule", "space_hard_rule"),
        facts: byLayer("project_fact", "space_approved_fact"),
        audienceAndVoice: byLayer("space_audience_voice"),
        examples: byLayer("historical_example"),
        personalPreferences: personalItems,
        sources,
        excluded: exclusions,
        totalEstimatedTokens: usedTokens,
      };

      const bundle: ContextBundle = {
        id: bundleId,
        request,
        items: [...items, ...personalItems],
        renderedText: renderContextBlock(space.name, project?.name ?? null, receipt),
        receipt,
        createdAt: generatedAt,
      };

      // 20. Auditable record of what was returned.
      deps.audit.record({
        actorId: actor.userId,
        action: "context.compile",
        resourceType: "context_bundle",
        resourceId: bundleId,
        detail: {
          spaceId: request.spaceId,
          projectId: request.projectId,
          integration: request.requestingIntegration,
          items: bundle.items.length,
          excluded: exclusions.length,
          tokens: usedTokens,
        },
      });

      return bundle;
    },
  };
}

export type ContextCompiler = ReturnType<typeof createContextCompiler>;

function renderSection(title: string, items: ContextItem[]): string {
  if (items.length === 0) return "";
  const lines = items.map((i) => `- ${i.text}`).join("\n");
  return `## ${title}\n${lines}\n\n`;
}

/** Human-readable context block, ready to paste into any AI surface. */
function renderContextBlock(
  spaceName: string,
  projectName: string | null,
  receipt: {
    rules: ContextItem[];
    facts: ContextItem[];
    audienceAndVoice: ContextItem[];
    examples: ContextItem[];
    personalPreferences: ContextItem[];
  },
): string {
  let text = `# Context: ${spaceName}${projectName ? ` — ${projectName}` : ""}\n\n`;
  text += renderSection("Rules (binding)", receipt.rules);
  text += renderSection("Audience & voice", receipt.audienceAndVoice);
  text += renderSection("Current facts & decisions", receipt.facts);
  text += renderSection("Reference examples", receipt.examples);
  text += renderSection("Personal preferences (yield to rules above)", receipt.personalPreferences);
  return text.trimEnd() + "\n";
}
