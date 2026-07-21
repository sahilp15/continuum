import {
  ContinuumError,
  notFound,
  sensitivityRank,
  type OrganizationRole,
  type Sensitivity,
  type SpaceRole,
} from "@continuum/contracts";
import type { Actor } from "./actor.js";

/**
 * Membership lookups the policy layer needs. Backed by the database in
 * production and by an in-memory store in tests and demos.
 */
export interface AuthorizationStore {
  organizationRole(userId: string, organizationId: string): Promise<OrganizationRole | null>;
  /** Space role, resolved through org membership + explicit space membership. */
  spaceRole(userId: string, spaceId: string): Promise<SpaceRole | null>;
  /** The organization a Space belongs to, or null if the Space doesn't exist. */
  spaceOrganization(spaceId: string): Promise<string | null>;
  /** The Space a Project belongs to, or null if the Project doesn't exist. */
  projectSpace(projectId: string): Promise<string | null>;
}

/**
 * Centralized policy functions (spec §28). All return booleans; the assert*
 * helpers convert failures into resource-hiding `not_found` errors so
 * unauthorized callers cannot infer that a resource exists (spec §25.5).
 */

export async function canViewOrganization(
  store: AuthorizationStore,
  actor: Actor,
  organizationId: string,
): Promise<boolean> {
  return (await store.organizationRole(actor.userId, organizationId)) !== null;
}

export async function canManageOrganization(
  store: AuthorizationStore,
  actor: Actor,
  organizationId: string,
): Promise<boolean> {
  const role = await store.organizationRole(actor.userId, organizationId);
  return role === "owner" || role === "admin";
}

export async function canViewSpace(
  store: AuthorizationStore,
  actor: Actor,
  spaceId: string,
): Promise<boolean> {
  return (await store.spaceRole(actor.userId, spaceId)) !== null;
}

export async function canEditSpace(
  store: AuthorizationStore,
  actor: Actor,
  spaceId: string,
): Promise<boolean> {
  const role = await store.spaceRole(actor.userId, spaceId);
  return role === "admin" || role === "editor";
}

export async function canViewProject(
  store: AuthorizationStore,
  actor: Actor,
  projectId: string,
): Promise<boolean> {
  const spaceId = await store.projectSpace(projectId);
  if (!spaceId) return false;
  return canViewSpace(store, actor, spaceId);
}

export async function canApproveMemory(
  store: AuthorizationStore,
  actor: Actor,
  spaceId: string,
): Promise<boolean> {
  return canEditSpace(store, actor, spaceId);
}

export async function canInstallConnector(
  store: AuthorizationStore,
  actor: Actor,
  organizationId: string,
): Promise<boolean> {
  return canManageOrganization(store, actor, organizationId);
}

export async function canSearchConnector(
  store: AuthorizationStore,
  actor: Actor,
  spaceId: string,
): Promise<boolean> {
  return canViewSpace(store, actor, spaceId);
}

export async function canExecuteConnectorAction(
  store: AuthorizationStore,
  actor: Actor,
  spaceId: string,
): Promise<boolean> {
  // Level-4 confirmed actions require edit rights; confirmation UX is enforced
  // separately at the gateway (spec §20).
  return canEditSpace(store, actor, spaceId);
}

export function canViewSensitiveItem(actor: Actor, itemSensitivity: Sensitivity): boolean {
  return sensitivityRank(itemSensitivity) <= sensitivityRank(actor.sensitivityAllowance);
}

export async function canExportData(
  store: AuthorizationStore,
  actor: Actor,
  organizationId: string,
): Promise<boolean> {
  return canManageOrganization(store, actor, organizationId);
}

export async function canDeleteData(
  store: AuthorizationStore,
  actor: Actor,
  organizationId: string,
): Promise<boolean> {
  const role = await store.organizationRole(actor.userId, organizationId);
  return role === "owner";
}

/** Throws a resource-hiding not_found error unless the actor can view the Space. */
export async function assertSpaceAccess(
  store: AuthorizationStore,
  actor: Actor,
  spaceId: string,
): Promise<void> {
  if (!(await canViewSpace(store, actor, spaceId))) {
    throw notFound("space");
  }
}

/** Throws unless the Project exists, is visible, and belongs to the given Space. */
export async function assertProjectInSpace(
  store: AuthorizationStore,
  actor: Actor,
  projectId: string,
  spaceId: string,
): Promise<void> {
  const projectSpace = await store.projectSpace(projectId);
  if (!projectSpace || projectSpace !== spaceId) {
    throw notFound("project");
  }
  await assertSpaceAccess(store, actor, spaceId);
}

export function assertSensitivityAllowed(actor: Actor, itemSensitivity: Sensitivity): void {
  if (!canViewSensitiveItem(actor, itemSensitivity)) {
    throw new ContinuumError("forbidden", "sensitivity level not permitted for this surface");
  }
}
