import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContinuumError, memoryTypeSchema } from "@continuum/contracts";
import type { Actor } from "@continuum/auth";
import type { DemoEnvironment } from "@continuum/evals";

/**
 * The Continuum MCP server (spec §23.1). Every tool authenticates the actor,
 * validates inputs with Zod, enforces Space authorization through the same
 * policy layer as every other surface, and returns structured output.
 * Resource-hiding errors mean unauthorized tools cannot probe for Spaces.
 */
export function createContinuumMcpServer(env: DemoEnvironment, actor: Actor): McpServer {
  const server = new McpServer({ name: "continuum", version: "0.1.0" });

  function ok(payload: unknown) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    };
  }

  function fail(error: unknown) {
    const message =
      error instanceof ContinuumError
        ? `${error.code}: ${error.message}`
        : "internal: unexpected error";
    return {
      isError: true,
      content: [{ type: "text" as const, text: message }],
    };
  }

  server.registerTool(
    "continuum_list_spaces",
    {
      title: "List Spaces",
      description: "List the Spaces the authenticated user can access.",
      inputSchema: {},
    },
    async () => {
      try {
        const visible = [];
        for (const space of env.data.spaces) {
          const memories = await env.memoryService
            .listSpaceMemories(actor, space.id)
            .catch(() => null);
          if (memories) {
            visible.push({ id: space.id, name: space.name, kind: space.kind });
          }
        }
        return ok({ spaces: visible });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "continuum_list_projects",
    {
      title: "List Projects",
      description: "List Projects inside a Space.",
      inputSchema: { spaceId: z.string() },
    },
    async ({ spaceId }) => {
      try {
        // Authorization check via the memory service (throws not_found if unauthorized).
        await env.memoryService.listSpaceMemories(actor, spaceId);
        const projects = env.data.projects
          .filter((p) => p.spaceId === spaceId)
          .map((p) => ({ id: p.id, name: p.name, objective: p.objective, status: p.status }));
        return ok({ projects });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "continuum_get_context",
    {
      title: "Get Context",
      description:
        "Compile the smallest trustworthy context package for a task in a Space (and optional Project). Includes a Context Receipt.",
      inputSchema: {
        spaceId: z.string(),
        projectId: z.string().optional(),
        task: z.string().max(4000).default(""),
        tokenBudget: z.number().int().min(200).max(32000).default(4000),
      },
    },
    async ({ spaceId, projectId, task, tokenBudget }) => {
      try {
        const space = env.getSpace(spaceId);
        const bundle = await env.compiler.compile(actor, {
          organizationId: space?.organizationId ?? "org_unknown0000000000",
          spaceId,
          projectId: projectId ?? null,
          requestingIntegration: "mcp",
          taskDescription: task,
          tokenBudget,
        });
        return ok({
          bundleId: bundle.id,
          contextText: bundle.renderedText,
          receipt: bundle.receipt,
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "continuum_search_memory",
    {
      title: "Search Memory",
      description: "Search approved memory inside one Space.",
      inputSchema: { spaceId: z.string(), query: z.string().min(1).max(500) },
    },
    async ({ spaceId, query }) => {
      try {
        const memories = await env.memoryService.listSpaceMemories(actor, spaceId);
        const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
        const results = memories
          .filter((m) => m.status === "approved")
          .map((m) => {
            const haystack = `${m.title} ${m.canonicalText}`.toLowerCase();
            const score = terms.reduce((s, t) => (haystack.includes(t) ? s + 1 : s), 0);
            return { memory: m, score };
          })
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map((r) => ({
            id: r.memory.id,
            type: r.memory.type,
            title: r.memory.title,
            text: r.memory.canonicalText,
            status: r.memory.status,
          }));
        return ok({ results });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "continuum_list_suggestions",
    {
      title: "List Memory Suggestions",
      description: "List pending candidate memories awaiting review in a Space.",
      inputSchema: { spaceId: z.string() },
    },
    async ({ spaceId }) => {
      try {
        const suggestions = await env.memoryService.listSuggestions(actor, spaceId);
        return ok({ suggestions });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "continuum_propose_memory",
    {
      title: "Propose Memory",
      description:
        "Propose a new memory for a Space. Proposals always require human approval before becoming canonical.",
      inputSchema: {
        spaceId: z.string(),
        type: memoryTypeSchema,
        title: z.string().min(1).max(300),
        text: z.string().min(1).max(4000),
      },
    },
    async ({ spaceId, type, title, text }) => {
      try {
        const space = env.getSpace(spaceId);
        const memory = await env.memoryService.propose(actor, {
          organizationId: space?.organizationId ?? "org_unknown0000000000",
          spaceId,
          type,
          title,
          canonicalText: text,
          createdBy: actor.userId,
        });
        return ok({ memoryId: memory.id, status: memory.status });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "continuum_approve_suggestion",
    {
      title: "Approve Suggestion",
      description: "Approve a pending suggestion, creating approved memory.",
      inputSchema: { suggestionId: z.string() },
    },
    async ({ suggestionId }) => {
      try {
        const result = await env.memoryService.resolveSuggestion(actor, suggestionId, {
          action: "accept",
        });
        return ok({ suggestion: result.suggestion.status, memoryId: result.memory?.id ?? null });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "continuum_reject_suggestion",
    {
      title: "Reject Suggestion",
      description: "Reject a pending suggestion. No memory is created.",
      inputSchema: { suggestionId: z.string() },
    },
    async ({ suggestionId }) => {
      try {
        const result = await env.memoryService.resolveSuggestion(actor, suggestionId, {
          action: "reject",
        });
        return ok({ suggestion: result.suggestion.status });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "continuum_check_output",
    {
      title: "Preflight Check",
      description:
        "Run deterministic preflight checks on draft content against a Space's approved rules.",
      inputSchema: { spaceId: z.string(), content: z.string().min(1).max(100000) },
    },
    async ({ spaceId, content }) => {
      try {
        // Authorization first; preflight itself is Space-scoped.
        await env.memoryService.listSpaceMemories(actor, spaceId);
        const result = await env.preflight(spaceId, content);
        return ok(result);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "continuum_forget_memory",
    {
      title: "Forget Memory",
      description: "Soft-delete a memory so it never appears in retrieval again.",
      inputSchema: { memoryId: z.string() },
    },
    async ({ memoryId }) => {
      try {
        const memory = await env.memoryService.forget(actor, memoryId);
        return ok({ memoryId: memory.id, status: memory.status });
      } catch (error) {
        return fail(error);
      }
    },
  );

  return server;
}
