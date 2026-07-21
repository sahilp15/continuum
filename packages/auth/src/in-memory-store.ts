import type { OrganizationRole, Project, Space, SpaceRole } from "@continuum/contracts";
import type { AuthorizationStore } from "./policies.js";

export interface InMemoryAuthInput {
  organizationMembers: Array<{ organizationId: string; userId: string; role: OrganizationRole }>;
  spaces: Space[];
  projects: Project[];
  /** Optional explicit space memberships; org members get implicit access. */
  spaceMembers?: Array<{ spaceId: string; userId: string; role: SpaceRole }>;
}

/**
 * In-memory AuthorizationStore for tests, demos, and local mock mode.
 * Org owners/admins get admin on every Space in the org; members get editor.
 */
export function createInMemoryAuthStore(input: InMemoryAuthInput): AuthorizationStore {
  const spacesById = new Map(input.spaces.map((s) => [s.id, s]));
  const projectsById = new Map(input.projects.map((p) => [p.id, p]));

  function orgRole(userId: string, organizationId: string): OrganizationRole | null {
    const member = input.organizationMembers.find(
      (m) => m.userId === userId && m.organizationId === organizationId,
    );
    return member?.role ?? null;
  }

  return {
    organizationRole(userId, organizationId) {
      return Promise.resolve(orgRole(userId, organizationId));
    },
    spaceRole(userId, spaceId) {
      const space = spacesById.get(spaceId);
      if (!space || space.deletedAt) return Promise.resolve(null);
      const explicit = input.spaceMembers?.find(
        (m) => m.userId === userId && m.spaceId === spaceId,
      );
      if (explicit) return Promise.resolve(explicit.role);
      const role = orgRole(userId, space.organizationId);
      if (role === "owner" || role === "admin") return Promise.resolve("admin");
      if (role === "member") return Promise.resolve("editor");
      return Promise.resolve(null);
    },
    spaceOrganization(spaceId) {
      return Promise.resolve(spacesById.get(spaceId)?.organizationId ?? null);
    },
    projectSpace(projectId) {
      const project = projectsById.get(projectId);
      if (!project || project.deletedAt) return Promise.resolve(null);
      return Promise.resolve(project.spaceId);
    },
  };
}
