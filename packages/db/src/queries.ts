import { projectSchema, type Project } from "@continuum/contracts";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { ContinuumDatabase } from "./client.js";
import {
  auditEvents,
  contextBundles,
  contextRequests,
  organizationMembers,
  projects,
  sessions,
  spaces,
} from "./schema/index.js";

const toIso = (d: Date | null): string | null => (d ? d.toISOString() : null);

/**
 * Delete a session row by its token (Better Auth session revocation is a row
 * delete). Returns the number of rows removed. Used to revoke a session without
 * clearing the browser cookie — e.g. the e2e "stale cookie" regression that
 * proves /home no longer loops when a cookie outlives its session.
 */
export async function deleteSessionByToken(
  db: ContinuumDatabase,
  token: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

/** Organization ids the user belongs to. */
export async function listUserOrganizationIds(
  db: ContinuumDatabase,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));
  return rows.map((r) => r.organizationId);
}

/** Active Projects across every Space the user can see. */
export async function listUserProjects(db: ContinuumDatabase, userId: string): Promise<Project[]> {
  const rows = await db
    .select({ project: projects })
    .from(projects)
    .innerJoin(organizationMembers, eq(organizationMembers.organizationId, projects.organizationId))
    .where(and(eq(organizationMembers.userId, userId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));
  return rows.map((r) =>
    projectSchema.parse({
      id: r.project.id,
      organizationId: r.project.organizationId,
      spaceId: r.project.spaceId,
      name: r.project.name,
      objective: r.project.objective,
      status: r.project.status,
      createdAt: toIso(r.project.createdAt)!,
      deletedAt: toIso(r.project.deletedAt),
    }),
  );
}

export interface ContextActivity {
  requestId: string;
  bundleId: string | null;
  spaceId: string;
  spaceName: string;
  projectId: string | null;
  requestingIntegration: string;
  taskDescription: string;
  createdAt: string;
}

/** Recent context generations (for the dashboard "recent activity" feed). */
export async function recentContextActivity(
  db: ContinuumDatabase,
  organizationIds: string[],
  limit = 8,
): Promise<ContextActivity[]> {
  if (organizationIds.length === 0) return [];
  const rows = await db
    .select({
      requestId: contextRequests.id,
      spaceId: contextRequests.spaceId,
      spaceName: spaces.name,
      projectId: contextRequests.projectId,
      requestingIntegration: contextRequests.requestingIntegration,
      taskDescription: contextRequests.taskDescription,
      createdAt: contextRequests.createdAt,
      bundleId: contextBundles.id,
    })
    .from(contextRequests)
    .innerJoin(spaces, eq(spaces.id, contextRequests.spaceId))
    .leftJoin(contextBundles, eq(contextBundles.requestId, contextRequests.id))
    .where(inArray(contextRequests.organizationId, organizationIds))
    .orderBy(desc(contextRequests.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    requestId: r.requestId,
    bundleId: r.bundleId ?? null,
    spaceId: r.spaceId,
    spaceName: r.spaceName,
    projectId: r.projectId,
    requestingIntegration: r.requestingIntegration,
    taskDescription: r.taskDescription,
    createdAt: toIso(r.createdAt)!,
  }));
}

export interface ActivityEvent {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  detail: Record<string, unknown>;
}

/** Recent audit events (for the dashboard "recent changes" feed). */
export async function recentAuditActivity(
  db: ContinuumDatabase,
  organizationIds: string[],
  limit = 12,
): Promise<ActivityEvent[]> {
  if (organizationIds.length === 0) return [];
  const rows = await db
    .select()
    .from(auditEvents)
    .where(inArray(auditEvents.organizationId, organizationIds))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    resourceType: r.resourceType,
    resourceId: r.resourceId,
    createdAt: toIso(r.createdAt)!,
    detail: r.detail,
  }));
}
