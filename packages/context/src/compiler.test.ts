import { describe, expect, it } from "vitest";
import {
  createDemoDataset,
  demoOrganizations,
  demoProfile,
  demoProjects,
  demoSpaces,
  demoUsers,
  fizzpopMemories,
  northbankMemories,
} from "@continuum/testing";
import { createInMemoryAuthStore, userActor } from "@continuum/auth";
import { createInMemoryMemoryStore } from "@continuum/memory";
import { createContextCompiler } from "./compiler.js";

const NOW = new Date("2026-03-12T12:00:00.000Z");

function buildCompiler() {
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
  const audits: Array<Record<string, unknown>> = [];
  const compiler = createContextCompiler({
    store,
    authz,
    getSpace: (id) => Promise.resolve(data.spaces.find((s) => s.id === id) ?? null),
    getProject: (id) => Promise.resolve(data.projects.find((p) => p.id === id) ?? null),
    getProfile: (userId) => Promise.resolve(userId === demoProfile.userId ? demoProfile : null),
    audit: { record: (e) => audits.push(e) },
    now: () => NOW,
  });
  return { compiler, audits };
}

const alex = userActor(demoUsers.freelancer.id);
const outsider = userActor(demoUsers.outsider.id);

describe("cross-space isolation (release-blocking)", () => {
  it("Northbank bundles never contain FizzPop information", async () => {
    const { compiler } = buildCompiler();
    const bundle = await compiler.compile(alex, {
      organizationId: demoOrganizations.studio.id,
      spaceId: demoSpaces.northbank.id,
      projectId: demoProjects.marchNewsletter.id,
      requestingIntegration: "mcp",
      taskDescription: "Write the March newsletter",
    });
    const fizzpopIds = new Set(Object.values(fizzpopMemories).map((m) => m.id));
    for (const item of bundle.items) {
      expect(fizzpopIds.has(item.memoryId)).toBe(false);
    }
    expect(bundle.renderedText).not.toMatch(/fizzpop/i);
  });

  it("FizzPop bundles never contain Northbank information", async () => {
    const { compiler } = buildCompiler();
    const bundle = await compiler.compile(alex, {
      organizationId: demoOrganizations.studio.id,
      spaceId: demoSpaces.fizzpop.id,
      requestingIntegration: "mcp",
      taskDescription: "Write an Instagram caption for Cherry Blast",
    });
    const northbankIds = new Set(Object.values(northbankMemories).map((m) => m.id));
    for (const item of bundle.items) {
      expect(northbankIds.has(item.memoryId)).toBe(false);
    }
    expect(bundle.renderedText).not.toMatch(/northbank/i);
  });

  it("unauthorized actors get a resource-hiding error", async () => {
    const { compiler } = buildCompiler();
    await expect(
      compiler.compile(outsider, {
        organizationId: demoOrganizations.studio.id,
        spaceId: demoSpaces.northbank.id,
        requestingIntegration: "mcp",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("validity and precedence", () => {
  it("includes the current deadline and excludes superseded/rejected/expired memory", async () => {
    const { compiler } = buildCompiler();
    const bundle = await compiler.compile(alex, {
      organizationId: demoOrganizations.studio.id,
      spaceId: demoSpaces.northbank.id,
      projectId: demoProjects.marchNewsletter.id,
      requestingIntegration: "web_app",
      taskDescription: "newsletter deadline",
    });
    const ids = bundle.items.map((i) => i.memoryId);
    expect(ids).toContain(northbankMemories.currentDeadline!.id);
    expect(ids).not.toContain(northbankMemories.oldDeadline!.id);
    expect(ids).not.toContain(northbankMemories.rejectedMemes!.id);
    expect(ids).not.toContain(northbankMemories.expiredPromo!.id);

    const excludedIds = bundle.receipt.excluded.map((e) => e.memoryId);
    expect(excludedIds).toContain(northbankMemories.oldDeadline!.id);
    expect(excludedIds).toContain(northbankMemories.rejectedMemes!.id);
  });

  it("personal humor preference never outranks Northbank's no-jokes rule", async () => {
    const { compiler } = buildCompiler();
    const bundle = await compiler.compile(alex, {
      organizationId: demoOrganizations.studio.id,
      spaceId: demoSpaces.northbank.id,
      requestingIntegration: "web_app",
      taskDescription: "write a headline",
    });
    const noJokes = bundle.items.find((i) => i.memoryId === northbankMemories.noJokes!.id);
    const humorPref = bundle.items.find(
      (i) => i.layer === "personal_preference" && /humor/i.test(i.text),
    );
    expect(noJokes).toBeDefined();
    expect(humorPref).toBeDefined();
    // The rule appears strictly before the preference, and the rendered block
    // instructs the AI that preferences yield to rules.
    expect(bundle.items.indexOf(noJokes!)).toBeLessThan(bundle.items.indexOf(humorPref!));
    expect(bundle.renderedText).toContain("yield to rules above");
  });

  it("blocks memory above the surface's sensitivity allowance", async () => {
    const { compiler } = buildCompiler();
    const bundle = await compiler.compile(alex, {
      organizationId: demoOrganizations.studio.id,
      spaceId: demoSpaces.northbank.id,
      requestingIntegration: "browser_extension",
      sensitivityAllowance: "public",
    });
    // All demo memories are internal; a public-only surface receives none of them.
    expect(bundle.items.filter((i) => i.layer !== "personal_preference")).toHaveLength(0);
    expect(
      bundle.receipt.excluded.filter((e) => e.reason === "sensitivity_blocked").length,
    ).toBeGreaterThan(0);
  });
});

describe("context receipts", () => {
  it("receipts show rules, facts, sources, and exclusions", async () => {
    const { compiler, audits } = buildCompiler();
    const bundle = await compiler.compile(alex, {
      organizationId: demoOrganizations.studio.id,
      spaceId: demoSpaces.northbank.id,
      projectId: demoProjects.marchNewsletter.id,
      requestingIntegration: "mcp",
      taskDescription: "write the March newsletter about investing returns",
    });
    expect(bundle.receipt.spaceName).toBe("Northbank");
    expect(bundle.receipt.projectName).toBe("March Newsletter");
    expect(bundle.receipt.rules.length).toBeGreaterThanOrEqual(3);
    expect(bundle.receipt.sources.map((s) => s.title)).toContain("Slack message from Priya");
    expect(bundle.receipt.excluded.length).toBeGreaterThan(0);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "context.compile" });
  });

  it("stays within the token budget for non-mandatory items", async () => {
    const { compiler } = buildCompiler();
    const bundle = await compiler.compile(alex, {
      organizationId: demoOrganizations.studio.id,
      spaceId: demoSpaces.northbank.id,
      requestingIntegration: "api",
      tokenBudget: 200,
      taskDescription: "newsletter",
    });
    const optionalTokens = bundle.items
      .filter(
        (i) => !["space_compliance_rule", "space_hard_rule", "project_fact"].includes(i.layer),
      )
      .reduce((sum, i) => sum + i.estimatedTokens, 0);
    expect(optionalTokens).toBeLessThanOrEqual(200);
  });
});
