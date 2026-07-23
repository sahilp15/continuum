import {
  connectorInstallationSchema,
  newId,
  type ConnectorInstallation,
} from "@continuum/contracts";
import type { InstallationStore } from "@continuum/connectors-core";
import { eq } from "drizzle-orm";
import type { ContinuumDatabase } from "../client.js";
import { connectorInstallations, connectorScopes } from "../schema/index.js";

type InstallationRow = typeof connectorInstallations.$inferSelect;

const toIso = (d: Date | null): string | null => (d ? d.toISOString() : null);

/**
 * Drizzle-backed {@link InstallationStore}. `grantedScopes` lives in the
 * `connector_scopes` join table (hydrated per row, like `memory_sources`). The
 * secret itself never lives here — only the opaque `credentialRef` into the
 * vault. Revocation is modeled by the Gateway (status→revoked, credentialRef→
 * null, revokedAt set) and the vault deletion; this store just persists it.
 */
export function createDrizzleInstallationStore(db: ContinuumDatabase): InstallationStore {
  async function scopesFor(installationId: string): Promise<string[]> {
    const rows = await db
      .select({ scope: connectorScopes.scope })
      .from(connectorScopes)
      .where(eq(connectorScopes.installationId, installationId));
    return rows.map((r) => r.scope);
  }

  function rowToInstallation(row: InstallationRow, grantedScopes: string[]): ConnectorInstallation {
    return connectorInstallationSchema.parse({
      id: row.id,
      organizationId: row.organizationId,
      spaceId: row.spaceId,
      connectorId: row.connectorId,
      dataMode: row.dataMode,
      status: row.status,
      credentialRef: row.credentialRef,
      grantedScopes,
      installedAt: toIso(row.installedAt)!,
      revokedAt: toIso(row.revokedAt),
    });
  }

  async function writeScopes(installationId: string, scopes: string[]): Promise<void> {
    await db.delete(connectorScopes).where(eq(connectorScopes.installationId, installationId));
    if (scopes.length > 0) {
      await db.insert(connectorScopes).values(
        scopes.map((scope) => ({
          id: newId("cscope"),
          installationId,
          scope,
        })),
      );
    }
  }

  function toRow(installation: ConnectorInstallation): typeof connectorInstallations.$inferInsert {
    return {
      id: installation.id,
      organizationId: installation.organizationId,
      spaceId: installation.spaceId,
      connectorId: installation.connectorId,
      dataMode: installation.dataMode,
      status: installation.status,
      credentialRef: installation.credentialRef,
      installedAt: new Date(installation.installedAt),
      revokedAt: installation.revokedAt ? new Date(installation.revokedAt) : null,
    };
  }

  return {
    async get(installationId) {
      const rows = await db
        .select()
        .from(connectorInstallations)
        .where(eq(connectorInstallations.id, installationId));
      const row = rows[0];
      if (!row) return null;
      return rowToInstallation(row, await scopesFor(row.id));
    },
    async insert(installation) {
      await db.insert(connectorInstallations).values(toRow(installation));
      await writeScopes(installation.id, installation.grantedScopes);
    },
    async update(installation) {
      const { id, ...rest } = toRow(installation);
      await db.update(connectorInstallations).set(rest).where(eq(connectorInstallations.id, id));
      await writeScopes(installation.id, installation.grantedScopes);
    },
    async listByOrganization(organizationId) {
      const rows = await db
        .select()
        .from(connectorInstallations)
        .where(eq(connectorInstallations.organizationId, organizationId));
      return Promise.all(rows.map(async (row) => rowToInstallation(row, await scopesFor(row.id))));
    },
  };
}
