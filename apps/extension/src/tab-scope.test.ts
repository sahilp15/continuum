import { describe, expect, it } from "vitest";
import { createTabScopeStore } from "./tab-scope.js";

describe("per-tab space scope", () => {
  it("separate tabs hold separate Spaces simultaneously", () => {
    const store = createTabScopeStore();
    store.setSpace(1, "spc_northbank00000001");
    store.setSpace(2, "spc_fizzpop000000001");
    expect(store.get(1).spaceId).toBe("spc_northbank00000001");
    expect(store.get(2).spaceId).toBe("spc_fizzpop000000001");
  });

  it("switching a tab's Space resets its Project", () => {
    const store = createTabScopeStore();
    store.setSpace(1, "spc_northbank00000001");
    store.setProject(1, "prj_nb_march_news001");
    store.setSpace(1, "spc_fizzpop000000001");
    expect(store.get(1).projectId).toBeNull();
  });
});
