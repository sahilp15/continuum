import type { AuthorizationStore } from "@continuum/auth";
import type { OrganizationRole, SpaceRole } from "@continuum/contracts";
import { and, eq, isNull } from "drizzle-orm";
import type { ContinuumDatabase } from "../client.js";
import { organizationMembers, projects, spaceMembers, spaces } from "../schema/index.js";

/**
 * Drizzle-backed {@link AuthorizationStore}. Read-only role/membership lookups.
 * Same implicit-role rule as the in-memory store: org owner/admin → Space
 * `admin`, member → `editor`; explicit `space_members` rows override. Deleted
 * Spaces/Projects resolve to null (resource hiding upstream).
 */
export function createDrizzleAuthStore(db: ContinuumDatabase): AuthorizationStore {
  async function orgRole(userId: string, organizationId: string): Promise<OrganizationRole | null> {
    const rows = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
        ),
      )
      .limit(1);
    return rows[0]?.role ?? null;
  }

  return {
    async organizationRole(userId, organizationId) {
      return orgRole(userId, organizationId);
    },

    async spaceRole(userId, spaceId) {
      const spaceRows = await db
        .select({ organizationId: spaces.organizationId })
        .from(spaces)
        .where(and(eq(spaces.id, spaceId), isNull(spaces.deletedAt)))
        .limit(1);
      const space = spaceRows[0];
      if (!space) return null;

      const explicit = await db
        .select({ role: spaceMembers.role })
        .from(spaceMembers)
        .where(and(eq(spaceMembers.userId, userId), eq(spaceMembers.spaceId, spaceId)))
        .limit(1);
      if (explicit[0]) return explicit[0].role as SpaceRole;

      const role = await orgRole(userId, space.organizationId);
      if (role === "owner" || role === "admin") return "admin";
      if (role === "member") return "editor";
      return null;
    },

    async spaceOrganization(spaceId) {
      const rows = await db
        .select({ organizationId: spaces.organizationId })
        .from(spaces)
        .where(eq(spaces.id, spaceId))
        .limit(1);
      return rows[0]?.organizationId ?? null;
    },

    async projectSpace(projectId) {
      const rows = await db
        .select({ spaceId: projects.spaceId })
        .from(projects)
        .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
        .limit(1);
      return rows[0]?.spaceId ?? null;
    },
  };
}
