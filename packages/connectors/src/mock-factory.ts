import type { ConnectorManifest, NormalizedExternalItem } from "@continuum/contracts";
import type {
  ConnectorActionInput,
  ConnectorActionResult,
  ContinuumConnector,
} from "@continuum/connectors-core";

/**
 * Deterministic mock connector factory. Mock connectors implement the full
 * contract so the product, tests, and demos work with zero external
 * credentials — and they are always labeled `status: "mock"` so mocked
 * functionality is never presented as live (spec §21, §48).
 */

export interface MockItemSeed {
  externalId: string;
  type: NormalizedExternalItem["type"];
  title: string;
  content: string;
  authorName?: string;
}

export function createMockConnector(
  manifest: ConnectorManifest,
  seeds: MockItemSeed[],
): ContinuumConnector {
  function toItem(
    seed: MockItemSeed,
    organizationId: string,
    spaceId: string | null,
    installationId: string,
  ): NormalizedExternalItem {
    return {
      id: `ext_${manifest.id.replace(/-/g, "").slice(0, 12)}${seed.externalId}`.slice(0, 40),
      organizationId,
      ...(spaceId ? { spaceId } : {}),
      connectorId: manifest.id,
      installationId,
      externalId: seed.externalId,
      type: seed.type,
      title: seed.title,
      content: seed.content,
      ...(seed.authorName ? { author: { name: seed.authorName } } : {}),
      permissions: { visibility: "private", allowedEmails: [] },
      sensitivity: "internal",
      metadata: { mock: true },
    };
  }

  return {
    manifest,

    connect(input, context) {
      context.logger.info("mock connector connected", { connectorId: manifest.id });
      return Promise.resolve({
        installationId: context.installation.id,
        status: "mock" as const,
        grantedScopes: manifest.oauthScopes,
      });
    },

    disconnect(_installationId, context) {
      context.logger.info("mock connector disconnected", { connectorId: manifest.id });
      return Promise.resolve();
    },

    testConnection(_installationId, _context) {
      return Promise.resolve({
        healthy: true,
        detail: "mock connector is always healthy",
        checkedAt: new Date().toISOString(),
      });
    },

    search(input, context) {
      const terms = input.query.toLowerCase().split(/\W+/).filter(Boolean);
      const matches = seeds
        .filter((seed) => {
          if (input.entityTypes && !input.entityTypes.includes(seed.type)) return false;
          if (terms.length === 0) return true;
          const haystack = `${seed.title} ${seed.content}`.toLowerCase();
          return terms.some((t) => haystack.includes(t));
        })
        .slice(0, input.limit ?? 20)
        .map((seed) =>
          toItem(seed, context.organizationId, context.spaceId, context.installation.id),
        );
      return Promise.resolve({ items: matches, truncated: false });
    },

    fetch(input, context) {
      const seed = seeds.find((s) => s.externalId === input.externalId);
      if (!seed) {
        return Promise.reject(new Error(`mock item ${input.externalId} not found`));
      }
      return Promise.resolve(
        toItem(seed, context.organizationId, context.spaceId, context.installation.id),
      );
    },

    sync(input, context) {
      // Deterministic pagination: two items per page, cursor is the offset.
      const offset = input.cursor ? Number.parseInt(input.cursor, 10) : 0;
      const page = seeds.slice(offset, offset + 2);
      const nextOffset = offset + page.length;
      return Promise.resolve({
        items: page.map((seed) =>
          toItem(seed, context.organizationId, context.spaceId, context.installation.id),
        ),
        nextCursor: nextOffset < seeds.length ? String(nextOffset) : null,
        done: nextOffset >= seeds.length,
      });
    },

    executeAction(input: ConnectorActionInput, context): Promise<ConnectorActionResult> {
      if (input.capability === "draft") {
        return Promise.resolve({
          status: "drafted",
          detail: `mock draft created for action ${input.action}`,
        });
      }
      context.logger.info("mock external action executed", { action: input.action });
      return Promise.resolve({
        status: "executed",
        externalId: `mock-${input.action}-result`,
        detail: `mock action ${input.action} executed`,
      });
    },
  };
}
