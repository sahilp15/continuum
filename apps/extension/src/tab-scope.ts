import type { TabScope } from "./adapters/types.js";

/**
 * Per-tab Space/Project scoping (spec §23.2): each browser tab carries its own
 * active Space so Northbank and FizzPop can run side by side without mixing.
 */
export function createTabScopeStore() {
  const scopes = new Map<number, TabScope>();
  return {
    get(tabId: number): TabScope {
      return scopes.get(tabId) ?? { tabId, spaceId: null, projectId: null };
    },
    setSpace(tabId: number, spaceId: string | null): TabScope {
      const next: TabScope = { ...this.get(tabId), spaceId, projectId: null };
      scopes.set(tabId, next);
      return next;
    },
    setProject(tabId: number, projectId: string | null): TabScope {
      const next: TabScope = { ...this.get(tabId), projectId };
      scopes.set(tabId, next);
      return next;
    },
    clear(tabId: number): void {
      scopes.delete(tabId);
    },
  };
}
