import type {
  ConnectorCapability,
  ConnectorDataMode,
  ConnectorInstallation,
  ConnectorManifest,
  NormalizedExternalItem,
} from "@continuum/contracts";
import type { CredentialVaultProvider } from "@continuum/integrations";
import type { Logger } from "@continuum/observability";

/** Runtime services handed to every connector call. */
export interface ConnectorExecutionContext {
  organizationId: string;
  spaceId: string | null;
  installation: ConnectorInstallation;
  vault: CredentialVaultProvider;
  logger: Logger;
  fetchImpl?: typeof fetch;
}

export interface ConnectInput {
  organizationId: string;
  spaceId: string | null;
  dataMode: ConnectorDataMode;
  /** OAuth authorization code or API key reference, depending on manifest.auth. */
  credential: string | null;
  config: Record<string, string>;
}

export interface ConnectResult {
  installationId: string;
  status: "connected" | "mock";
  grantedScopes: string[];
}

export interface ConnectionHealthResult {
  healthy: boolean;
  detail: string;
  checkedAt: string;
}

export interface ConnectorSearchInput {
  query: string;
  entityTypes?: string[];
  limit?: number;
}

export interface ConnectorSearchResult {
  items: NormalizedExternalItem[];
  /** Whether provider-side truncation happened. */
  truncated: boolean;
}

export interface ConnectorFetchInput {
  externalId: string;
}

export interface ConnectorSyncInput {
  mode: "full" | "incremental";
  cursor: string | null;
}

export interface ConnectorSyncResult {
  items: NormalizedExternalItem[];
  nextCursor: string | null;
  done: boolean;
}

export interface ConnectorWebhookInput {
  headers: Record<string, string>;
  body: string;
}

export interface ConnectorWebhookResult {
  accepted: boolean;
  items: NormalizedExternalItem[];
}

export interface ConnectorActionInput {
  action: string;
  capability: ConnectorCapability;
  payload: Record<string, unknown>;
  /** Required for level-4 actions; the gateway enforces its presence. */
  idempotencyKey?: string;
  confirmed?: boolean;
}

export interface ConnectorActionResult {
  status: "drafted" | "executed";
  externalId?: string;
  detail: string;
}

/** The standard connector interface every adapter implements (spec §16). */
export interface ContinuumConnector {
  manifest: ConnectorManifest;

  connect(input: ConnectInput, context: ConnectorExecutionContext): Promise<ConnectResult>;

  disconnect(installationId: string, context: ConnectorExecutionContext): Promise<void>;

  testConnection(
    installationId: string,
    context: ConnectorExecutionContext,
  ): Promise<ConnectionHealthResult>;

  search(
    input: ConnectorSearchInput,
    context: ConnectorExecutionContext,
  ): Promise<ConnectorSearchResult>;

  fetch(
    input: ConnectorFetchInput,
    context: ConnectorExecutionContext,
  ): Promise<NormalizedExternalItem>;

  sync?(
    input: ConnectorSyncInput,
    context: ConnectorExecutionContext,
  ): Promise<ConnectorSyncResult>;

  handleWebhook?(
    input: ConnectorWebhookInput,
    context: ConnectorExecutionContext,
  ): Promise<ConnectorWebhookResult>;

  executeAction?(
    input: ConnectorActionInput,
    context: ConnectorExecutionContext,
  ): Promise<ConnectorActionResult>;
}
