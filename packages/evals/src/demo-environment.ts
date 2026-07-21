import {
  createDemoDataset,
  demoOrganizations,
  demoProfile,
  demoUsers,
  type DemoDataset,
} from "@continuum/testing";
import { createInMemoryAuthStore, type AuthorizationStore } from "@continuum/auth";
import {
  createInMemoryMemoryStore,
  createMemoryService,
  createRecordingAuditSink,
  type MemoryService,
  type MemoryStore,
} from "@continuum/memory";
import { createContextCompiler, type ContextCompiler } from "@continuum/context";
import { runPreflight } from "@continuum/preflight";
import type { PreflightResult, Space } from "@continuum/contracts";

export interface DemoEnvironment {
  data: DemoDataset;
  store: MemoryStore;
  authz: AuthorizationStore;
  memoryService: MemoryService;
  compiler: ContextCompiler;
  auditEvents: Array<Record<string, unknown>>;
  preflight(spaceId: string, content: string): Promise<PreflightResult>;
  getSpace(spaceId: string): Space | null;
}

/**
 * One fully wired, deterministic Continuum environment backed by the
 * Northbank/FizzPop fixtures. Used by the eval suite, the MCP server's demo
 * mode, and the web app's demo mode — all three exercise identical code paths
 * through the real services.
 */
export function createDemoEnvironment(now: () => Date = () => new Date()): DemoEnvironment {
  const data = createDemoDataset();
  const store = createInMemoryMemoryStore({
    memories: data.memories,
    suggestions: data.suggestions,
    sources: data.sources,
  });
  const authz = createInMemoryAuthStore({
    organizationMembers: [
      {
        organizationId: demoOrganizations.studio.id,
        userId: demoUsers.freelancer.id,
        role: "owner",
      },
      { organizationId: demoOrganizations.other.id, userId: demoUsers.outsider.id, role: "owner" },
    ],
    spaces: data.spaces,
    projects: data.projects,
  });
  const audit = createRecordingAuditSink();
  const memoryService = createMemoryService({ store, authz, audit, now });
  const compiler = createContextCompiler({
    store,
    authz,
    getSpace: (id) => Promise.resolve(data.spaces.find((s) => s.id === id) ?? null),
    getProject: (id) => Promise.resolve(data.projects.find((p) => p.id === id) ?? null),
    getProfile: (userId) => Promise.resolve(userId === demoProfile.userId ? demoProfile : null),
    audit,
    now,
  });

  return {
    data,
    store,
    authz,
    memoryService,
    compiler,
    auditEvents: audit.events,
    async preflight(spaceId, content) {
      const space = data.spaces.find((s) => s.id === spaceId);
      if (!space) throw new Error("unknown space");
      const memories = await store.listSpaceMemories(spaceId);
      return runPreflight({
        space,
        memories,
        otherSpaceNames: data.spaces.filter((s) => s.id !== spaceId).map((s) => s.name),
        content,
        now: now(),
      });
    },
    getSpace(spaceId) {
      return data.spaces.find((s) => s.id === spaceId) ?? null;
    },
  };
}
