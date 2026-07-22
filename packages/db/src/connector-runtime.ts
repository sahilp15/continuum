import type { ContinuumConnector } from "@continuum/connectors-core";
import {
  createConnectorGateway,
  createConnectorRegistry,
  type ConnectorGateway,
} from "@continuum/connectors-core";
import {
  createCredentialKeyring,
  createEncryptedCredentialVault,
  type CredentialKeyring,
  type RotatableCredentialVault,
} from "@continuum/integrations";
import { createLogger, type Logger } from "@continuum/observability";
import type { ContinuumDatabase } from "./client.js";
import { createDbAuditSink, type DbAuditSink } from "./audit.js";
import { connectorDefinitions } from "./schema/index.js";
import { createDrizzleInstallationStore } from "./stores/installation-store.js";
import { createDrizzleSealedSecretStore } from "./stores/credential-vault-store.js";

/**
 * Persist each connector's manifest into `connector_definitions` (idempotent
 * upsert). Installations FK-reference this catalog, so definitions must exist
 * before any install. Runs at runtime construction, not migration time.
 */
export async function syncConnectorDefinitions(
  db: ContinuumDatabase,
  connectors: ContinuumConnector[],
): Promise<void> {
  if (connectors.length === 0) return;
  const now = new Date();
  for (const connector of connectors) {
    const m = connector.manifest;
    await db
      .insert(connectorDefinitions)
      .values({
        id: m.id,
        displayName: m.displayName,
        category: m.category,
        version: m.version,
        manifest: m as unknown as Record<string, unknown>,
        status: m.status,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: connectorDefinitions.id,
        set: {
          displayName: m.displayName,
          category: m.category,
          version: m.version,
          manifest: m as unknown as Record<string, unknown>,
          status: m.status,
        },
      });
  }
}

export interface ConnectorRuntime {
  gateway: ConnectorGateway;
  vault: RotatableCredentialVault;
  keyring: CredentialKeyring;
  installations: ReturnType<typeof createDrizzleInstallationStore>;
  /** Upsert the registered connectors' manifests into `connector_definitions`. */
  syncDefinitions(): Promise<void>;
}

/**
 * Compose the real connector stack over the database: an AES-256-GCM credential
 * vault (keys from `CONTINUUM_CREDENTIAL_KEYS`, outside the DB), the Drizzle
 * installation store, a registry of the given connectors, and the Gateway that
 * enforces capabilities, confirmation + idempotency, and revocation.
 *
 * `credentialKeys` is required — without it there is no vault and connecting is
 * impossible, which the UI surfaces honestly as "Setup required" rather than a
 * fake success.
 */
export function createConnectorRuntime(opts: {
  db: ContinuumDatabase;
  connectors: ContinuumConnector[];
  credentialKeys: string;
  audit?: DbAuditSink;
  logger?: Logger;
  now?: () => Date;
}): ConnectorRuntime {
  const keyring = createCredentialKeyring(opts.credentialKeys);
  const vault = createEncryptedCredentialVault({
    keyring,
    store: createDrizzleSealedSecretStore(opts.db),
  });
  const installations = createDrizzleInstallationStore(opts.db);
  const registry = createConnectorRegistry();
  for (const connector of opts.connectors) registry.register(connector);

  const gateway = createConnectorGateway({
    registry,
    installations,
    vault,
    logger: opts.logger ?? createLogger({ name: "connector-gateway" }),
    audit: opts.audit ?? createDbAuditSink(opts.db),
    ...(opts.now ? { now: opts.now } : {}),
  });

  return {
    gateway,
    vault,
    keyring,
    installations,
    syncDefinitions: () => syncConnectorDefinitions(opts.db, opts.connectors),
  };
}
