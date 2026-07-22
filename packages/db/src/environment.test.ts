import { userActor } from "@continuum/auth";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, type DatabaseHandle } from "./client.js";
import { createDbEnvironment, type DbEnvironment } from "./environment.js";
import { contextRequests, memories, users } from "./schema/index.js";

async function makeUser(env: DbEnvironment, id: string, email: string): Promise<void> {
  await env.db.insert(users).values({ id, name: email.split("@")[0]!, email });
}

describe("DbEnvironment (Drizzle-backed, on PGlite)", () => {
  let handle: DatabaseHandle;
  let env: DbEnvironment;

  beforeEach(async () => {
    handle = await createTestDatabase();
    env = createDbEnvironment(handle.db);
  });
  afterEach(async () => {
    await handle.close();
  });

  it("tenancy: creates and lists orgs, Spaces, Projects, and profiles", async () => {
    await makeUser(env, "usr_a1", "a@example.com");
    const org = await env.tenancy.getOrCreatePersonalOrg("usr_a1");
    expect(org).toMatch(/^org_/);
    expect(await env.tenancy.getOrCreatePersonalOrg("usr_a1")).toBe(org); // idempotent

    const space = await env.tenancy.createSpace({
      organizationId: org,
      name: "Acme Client",
      kind: "client",
    });
    expect(space.id).toMatch(/^spc_/);
    expect(space.slug).toBe("acme-client");
    expect((await env.tenancy.listUserSpaces("usr_a1")).map((s) => s.id)).toContain(space.id);

    const project = await env.tenancy.createProject({
      organizationId: org,
      spaceId: space.id,
      name: "Q1 Launch",
    });
    expect(project.id).toMatch(/^prj_/);
    expect((await env.tenancy.listSpaceProjects(space.id)).map((p) => p.id)).toEqual([project.id]);

    const profile = await env.tenancy.upsertProfile({
      userId: "usr_a1",
      displayName: "Alex",
      preferences: ["concise", "evidence-led"],
    });
    expect(profile.preferences).toEqual(["concise", "evidence-led"]);
    // upsert again updates in place
    const updated = await env.tenancy.upsertProfile({ userId: "usr_a1", displayName: "Alexandra" });
    expect(updated.displayName).toBe("Alexandra");
  });

  it("full workflow: import → extract → approve → generate a persisted Context Receipt", async () => {
    await makeUser(env, "usr_b1", "b@example.com");
    const org = await env.tenancy.getOrCreatePersonalOrg("usr_b1");
    const space = await env.tenancy.createSpace({
      organizationId: org,
      name: "Northbank",
      kind: "client",
    });
    const actor = userActor("usr_b1");

    const { source, suggestions } = await env.importSource(actor, {
      organizationId: org,
      spaceId: space.id,
      kind: "pasted_text",
      title: "Campaign brief",
      content: "The February newsletter launches on March 21. The review deadline is firm.",
    });
    expect(source.id).toMatch(/^src_/);
    expect(suggestions.length).toBeGreaterThan(0); // a deadline candidate

    const { memory } = await env.memoryService.resolveSuggestion(actor, suggestions[0]!.id, {
      action: "accept",
    });
    expect(memory?.status).toBe("approved");

    const mems = await env.memoryService.listSpaceMemories(actor, space.id);
    expect(mems.some((m) => m.id === memory!.id && m.status === "approved")).toBe(true);

    // The approved memory persisted to the DB (survives a fresh env on same db).
    const persisted = await env.db.select().from(memories).where(eq(memories.id, memory!.id));
    expect(persisted).toHaveLength(1);

    const bundle = await env.generateContext(actor, {
      organizationId: org,
      spaceId: space.id,
      requestingIntegration: "web_app",
      taskDescription: "Draft the February newsletter",
    });
    expect(bundle.id).toMatch(/^ctx_/);
    expect(bundle.receipt.spaceName).toBe("Northbank");
    // Context activity was persisted for the dashboard feed.
    const reqs = await env.db.select().from(contextRequests);
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.actorId).toBe("usr_b1");
  });

  it("cross-Space isolation: a user cannot read another org's Space", async () => {
    await makeUser(env, "usr_owner", "owner@example.com");
    await makeUser(env, "usr_outsider", "outsider@example.com");
    const ownerOrg = await env.tenancy.getOrCreatePersonalOrg("usr_owner");
    await env.tenancy.getOrCreatePersonalOrg("usr_outsider");
    const privateSpace = await env.tenancy.createSpace({
      organizationId: ownerOrg,
      name: "Private",
      kind: "personal",
    });

    // The outsider (a different org) is denied — resource-hiding not_found.
    await expect(
      env.memoryService.listSpaceMemories(userActor("usr_outsider"), privateSpace.id),
    ).rejects.toMatchObject({ code: "not_found" });

    // And context generation for a Space they can't see is denied too.
    await expect(
      env.generateContext(userActor("usr_outsider"), {
        organizationId: ownerOrg,
        spaceId: privateSpace.id,
        requestingIntegration: "web_app",
      }),
    ).rejects.toBeTruthy();
  });
});
