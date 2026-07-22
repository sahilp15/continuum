import {
  connectorManifestSchema,
  ContinuumError,
  newId,
  type ConnectorCapability,
  type ConnectorDataMode,
  type ConnectorInstallation,
} from "@continuum/contracts";
import type { CredentialVaultProvider } from "@continuum/integrations";
import type { Logger } from "@continuum/observability";
import type {
  ConnectorActionInput,
  ConnectorActionResult,
  ConnectorExecutionContext,
  ConnectorSearchInput,
  ConnectorSearchResult,
  ContinuumConnector,
} from "./connector.js";

/** Registry of available connectors. Manifests are validated on registration. */
export function createConnectorRegistry() {
  const connectors = new Map<string, ContinuumConnector>();
  return {
    register(connector: ContinuumConnector): void {
      const manifest = connectorManifestSchema.parse(connector.manifest);
      if (connectors.has(manifest.id)) {
        throw new ContinuumError("conflict", `connector ${manifest.id} already registered`);
      }
      connectors.set(manifest.id, connector);
    },
    get(connectorId: string): ContinuumConnector | null {
      return connectors.get(connectorId) ?? null;
    },
    list(): ContinuumConnector[] {
      return [...connectors.values()];
    },
  };
}

export type ConnectorRegistry = ReturnType<typeof createConnectorRegistry>;

export interface InstallationStore {
  get(installationId: string): Promise<ConnectorInstallation | null>;
  insert(installation: ConnectorInstallation): Promise<void>;
  update(installation: ConnectorInstallation): Promise<void>;
  listByOrganization(organizationId: string): Promise<ConnectorInstallation[]>;
}

export function createInMemoryInstallationStore(): InstallationStore {
  const installations = new Map<string, ConnectorInstallation>();
  return {
    get: (id) => Promise.resolve(installations.get(id) ?? null),
    insert: (installation) => {
      installations.set(installation.id, { ...installation });
      return Promise.resolve();
    },
    update: (installation) => {
      installations.set(installation.id, { ...installation });
      return Promise.resolve();
    },
    listByOrganization: (organizationId) =>
      Promise.resolve(
        [...installations.values()].filter((i) => i.organizationId === organizationId),
      ),
  };
}

export interface ConnectorGatewayDeps {
  registry: ConnectorRegistry;
  installations: InstallationStore;
  vault: CredentialVaultProvider;
  logger: Logger;
  audit: { record(event: Record<string, unknown>): void };
  now?: () => Date;
}

/** Input to {@link ConnectorGateway.connect}. `credential` is the OAuth
 *  authorization code / API key material the connector exchanges and seals into
 *  the vault — it is NEVER a login-provider token (login and connector auth stay
 *  strictly separate). */
export interface GatewayConnectInput {
  organizationId: string;
  spaceId: string | null;
  connectorId: string;
  dataMode: ConnectorDataMode;
  credential: string | null;
  config?: Record<string, string>;
}

/**
 * The Connector Gateway (spec §15, §20). Every connector call flows through
 * here so capability enforcement, revocation, idempotency, confirmation, and
 * audit logging cannot be bypassed by an individual adapter.
 */
export function createConnectorGateway(deps: ConnectorGatewayDeps) {
  const now = deps.now ?? (() => new Date());
  const executedActionKeys = new Set<string>();

  async function resolve(installationId: string): Promise<{
    connector: ContinuumConnector;
    installation: ConnectorInstallation;
    context: ConnectorExecutionContext;
  }> {
    const installation = await deps.installations.get(installationId);
    if (!installation) throw new ContinuumError("not_found", "installation not found");
    if (installation.status === "revoked") {
      throw new ContinuumError("forbidden", "connector installation has been revoked");
    }
    const connector = deps.registry.get(installation.connectorId);
    if (!connector) throw new ContinuumError("not_found", "connector not found");
    return {
      connector,
      installation,
      context: {
        organizationId: installation.organizationId,
        spaceId: installation.spaceId,
        installation,
        vault: deps.vault,
        logger: deps.logger.child({ connectorId: installation.connectorId, installationId }),
      },
    };
  }

  function assertCapability(connector: ContinuumConnector, capability: ConnectorCapability): void {
    if (!connector.manifest.capabilities.includes(capability)) {
      // A connector must never perform an action it has not declared.
      throw new ContinuumError(
        "forbidden",
        `connector ${connector.manifest.id} does not declare capability ${capability}`,
      );
    }
  }

  return {
    /**
     * Establish an installation. The Gateway mints the installation id and an
     * opaque credential ref, hands the connector a provisional installation so
     * it can seal its exchanged token into the vault at that ref, then persists
     * the result. If the connector sealed nothing (e.g. a mock, or a live-only
     * connector), no dangling credential ref is kept. Always audited.
     *
     * This is deliberately separate from login/social auth — the `credential`
     * here is a connector authorization code, never a reused login token.
     */
    async connect(input: GatewayConnectInput): Promise<ConnectorInstallation> {
      const connector = deps.registry.get(input.connectorId);
      if (!connector) throw new ContinuumError("not_found", "connector not found");

      const installationId = newId("cin");
      const credentialRef = newId("cred");
      const installedAt = now().toISOString();
      const provisional: ConnectorInstallation = {
        id: installationId,
        organizationId: input.organizationId,
        spaceId: input.spaceId,
        connectorId: input.connectorId,
        dataMode: input.dataMode,
        status: "connected",
        credentialRef,
        grantedScopes: [],
        installedAt,
        revokedAt: null,
      };
      const context: ConnectorExecutionContext = {
        organizationId: input.organizationId,
        spaceId: input.spaceId,
        installation: provisional,
        vault: deps.vault,
        logger: deps.logger.child({ connectorId: input.connectorId, installationId }),
      };

      const result = await connector.connect(
        {
          organizationId: input.organizationId,
          spaceId: input.spaceId,
          dataMode: input.dataMode,
          credential: input.credential,
          config: input.config ?? {},
        },
        context,
      );

      // Keep the credential ref only if the connector actually sealed a secret.
      const sealed = (await deps.vault.retrieve(credentialRef)) !== null;
      const installation: ConnectorInstallation = {
        ...provisional,
        status: result.status === "mock" ? "mock" : "connected",
        grantedScopes: result.grantedScopes,
        credentialRef: sealed ? credentialRef : null,
      };
      await deps.installations.insert(installation);
      deps.audit.record({
        action: "connector.connect",
        resourceType: "connector_installation",
        resourceId: installationId,
        detail: {
          connectorId: input.connectorId,
          status: installation.status,
          organizationId: input.organizationId,
        },
      });
      return installation;
    },

    async search(
      installationId: string,
      input: ConnectorSearchInput,
    ): Promise<ConnectorSearchResult> {
      const { connector, installation, context } = await resolve(installationId);
      assertCapability(connector, "search");
      const result = await connector.search(input, context);
      deps.audit.record({
        action: "connector.search",
        resourceType: "connector_installation",
        resourceId: installation.id,
        detail: { connectorId: connector.manifest.id, results: result.items.length },
      });
      return result;
    },

    async fetch(installationId: string, externalId: string) {
      const { connector, context } = await resolve(installationId);
      assertCapability(connector, "read");
      return connector.fetch({ externalId }, context);
    },

    async testConnection(installationId: string) {
      const { connector, context } = await resolve(installationId);
      return connector.testConnection(installationId, context);
    },

    /**
     * Level 3–4 actions (spec §20). Draft-level actions run directly; anything
     * that writes externally requires explicit confirmation and an
     * idempotency key, and is always audited.
     */
    async executeAction(
      installationId: string,
      input: ConnectorActionInput,
    ): Promise<ConnectorActionResult> {
      const { connector, installation, context } = await resolve(installationId);
      assertCapability(connector, input.capability);
      if (!connector.executeAction) {
        throw new ContinuumError("invalid_input", "connector does not support actions");
      }

      const writes: ConnectorCapability[] = ["create", "update", "send", "delete"];
      if (writes.includes(input.capability)) {
        if (!input.confirmed) {
          throw new ContinuumError(
            "forbidden",
            "external write actions require explicit confirmation",
          );
        }
        if (!input.idempotencyKey) {
          throw new ContinuumError(
            "invalid_input",
            "external write actions require an idempotency key",
          );
        }
        const key = `${installationId}:${input.action}:${input.idempotencyKey}`;
        if (executedActionKeys.has(key)) {
          return { status: "executed", detail: "duplicate suppressed by idempotency key" };
        }
        executedActionKeys.add(key);
      }

      const result = await connector.executeAction(input, context);
      deps.audit.record({
        action: `connector.action.${input.action}`,
        resourceType: "connector_installation",
        resourceId: installation.id,
        detail: {
          connectorId: connector.manifest.id,
          capability: input.capability,
          status: result.status,
          at: now().toISOString(),
        },
      });
      return result;
    },

    /** Revoke an installation: credentials are destroyed and future calls fail. */
    async revoke(installationId: string): Promise<void> {
      const installation = await deps.installations.get(installationId);
      if (!installation) throw new ContinuumError("not_found", "installation not found");
      if (installation.credentialRef) {
        await deps.vault.revoke(installation.credentialRef);
      }
      await deps.installations.update({
        ...installation,
        status: "revoked",
        credentialRef: null,
        revokedAt: now().toISOString(),
      });
      deps.audit.record({
        action: "connector.revoke",
        resourceType: "connector_installation",
        resourceId: installationId,
      });
    },
  };
}

export type ConnectorGateway = ReturnType<typeof createConnectorGateway>;
