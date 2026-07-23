"use server";

import { listUserOrganizationIds } from "@continuum/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/actor";
import { getConnectorRuntime } from "@/lib/connectors";
import { getEnv } from "@/lib/services";

/** The installation, only if it belongs to one of the caller's organizations —
 *  otherwise null (resource hiding: outsiders can't confirm it exists). */
async function authorizedInstallation(actorUserId: string, installationId: string) {
  const runtimePromise = getConnectorRuntime();
  if (!runtimePromise) return null;
  const runtime = await runtimePromise;
  const installation = await runtime.installations.get(installationId);
  if (!installation) return null;
  const orgIds = await listUserOrganizationIds(getEnv().db, actorUserId);
  return orgIds.includes(installation.organizationId) ? { runtime, installation } : null;
}

/** Disconnect: revokes the installation and destroys its vaulted credential. */
export async function disconnectInstallation(installationId: string): Promise<void> {
  const actor = await requireActor();
  const authorized = await authorizedInstallation(actor.userId, installationId);
  if (!authorized) redirect("/connectors?error=not_found");
  await authorized.runtime.gateway.revoke(installationId);
  revalidatePath("/connectors");
}

/**
 * Import one searched item: fetch it through the capability-enforced Gateway,
 * persist it as a `connector_item` source, run injection-safe extraction
 * (pending suggestions only), then land in the inbox for review.
 */
export async function importConnectorItem(
  installationId: string,
  externalId: string,
): Promise<void> {
  const actor = await requireActor();
  const authorized = await authorizedInstallation(actor.userId, installationId);
  if (!authorized) redirect("/connectors?error=not_found");
  const item = await authorized.runtime.gateway.fetch(installationId, externalId);
  await getEnv().importConnectorItem(actor, { item, installationId });
  revalidatePath("/inbox");
  redirect("/inbox");
}
