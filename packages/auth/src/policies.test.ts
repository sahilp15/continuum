import { describe, expect, it } from "vitest";
import {
  createDemoDataset,
  demoOrganizations,
  demoProjects,
  demoSpaces,
  demoUsers,
} from "@continuum/testing";
import { userActor } from "./actor.js";
import { createInMemoryAuthStore } from "./in-memory-store.js";
import {
  assertProjectInSpace,
  assertSpaceAccess,
  canDeleteData,
  canViewSensitiveItem,
  canViewSpace,
} from "./policies.js";

const data = createDemoDataset();
const store = createInMemoryAuthStore({
  organizationMembers: [
    { organizationId: demoOrganizations.studio.id, userId: demoUsers.freelancer.id, role: "owner" },
    { organizationId: demoOrganizations.other.id, userId: demoUsers.outsider.id, role: "owner" },
  ],
  spaces: data.spaces,
  projects: data.projects,
});

const alex = userActor(demoUsers.freelancer.id);
const outsider = userActor(demoUsers.outsider.id);

describe("space authorization", () => {
  it("grants members access to their own spaces", async () => {
    expect(await canViewSpace(store, alex, demoSpaces.northbank.id)).toBe(true);
    expect(await canViewSpace(store, alex, demoSpaces.fizzpop.id)).toBe(true);
  });

  it("denies access across organizations", async () => {
    expect(await canViewSpace(store, outsider, demoSpaces.northbank.id)).toBe(false);
    expect(await canViewSpace(store, alex, demoSpaces.otherOrgSpace.id)).toBe(false);
  });

  it("hides space existence from unauthorized users (not_found, not forbidden)", async () => {
    await expect(assertSpaceAccess(store, outsider, demoSpaces.northbank.id)).rejects.toMatchObject(
      { code: "not_found" },
    );
    // Identical error for a space that genuinely does not exist.
    await expect(assertSpaceAccess(store, outsider, "spc_does_not_exist01")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("rejects a project queried under the wrong space", async () => {
    await expect(
      assertProjectInSpace(store, alex, demoProjects.marchNewsletter.id, demoSpaces.fizzpop.id),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("sensitivity", () => {
  it("blocks items above the actor's allowance", () => {
    const extension = userActor(demoUsers.freelancer.id, "browser_extension", "internal");
    expect(canViewSensitiveItem(extension, "confidential")).toBe(false);
    expect(canViewSensitiveItem(extension, "internal")).toBe(true);
  });
});

describe("destructive rights", () => {
  it("only owners can delete data", async () => {
    expect(await canDeleteData(store, alex, demoOrganizations.studio.id)).toBe(true);
    expect(await canDeleteData(store, outsider, demoOrganizations.studio.id)).toBe(false);
  });
});
