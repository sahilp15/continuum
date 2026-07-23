import { userActor } from "@continuum/auth";
import type { ContinuumConnector } from "@continuum/connectors-core";
import { newId, type ConnectorInstallation, type ConnectorManifest } from "@continuum/contracts";
import { mockGoogleDrive } from "@continuum/connectors";
import { generateCredentialKey } from "@continuum/integrations";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, type DatabaseHandle } from "./client.js";
import { createConnectorRuntime, type ConnectorRuntime } from "./connector-runtime.js";
import { createDbEnvironment } from "./environment.js";
import { createTenancyRepository } from "./repositories/tenancy.js";
import { users } from "./schema/index.js";

/** A minimal OAuth-style connector that seals its exchanged token into the vault
 *  on connect — the shape a real adapter (Google, Phase 6) will follow. */
const sealingManifest: ConnectorManifest = {
  id: "test-sealing",
  displayName: "Sealing Test",
  category: "documents",
  logo: "connectors/test-sealing.svg",
  version: "0.1.0",
  auth: "oauth2",
  oauthScopes: ["files.readonly"],
  capabilities: ["search", "read"],
  entityTypes: ["document"],
  dataModes: ["user_selected"],
  supportsWebhooks: false,
  rateLimitNotes: "n/a",
  dataRetentionNotes: "n/a",
  permissionsDescription: "Read selected files.",
  requiredConfig: [],
  status: "beta",
};

const sealingConnector: ContinuumConnector = {
  manifest: sealingManifest,
  async connect(input, context) {
    // Exchange the auth code for a token, then seal it at the provisioned ref.
    await context.vault.store(context.installation.credentialRef!, `token-for:${input.credential}`);
    return {
      installationId: context.installation.id,
      status: "connected",
      grantedScopes: ["files.readonly"],
    };
  },
  disconnect: () => Promise.resolve(),
  testConnection: (_id, _ctx) =>
    Promise.resolve({ healthy: true, detail: "ok", checkedAt: new Date().toISOString() }),
  search: () => Promise.resolve({ items: [], truncated: false }),
  fetch: () => Promise.reject(new Error("no items")),
};

const KEYS = `v1:${generateCredentialKey()}`;

async function makeOrg(handle: DatabaseHandle, userId: string): Promise<string> {
  await handle.db.insert(users).values({ id: userId, name: "T", email: `${userId}@ex.com` });
  return createTenancyRepository(handle.db).getOrCreatePersonalOrg(userId);
}

async function makeSpace(handle: DatabaseHandle, organizationId: string): Promise<string> {
  const space = await createTenancyRepository(handle.db).createSpace({
    organizationId,
    name: "Client",
    kind: "client",
  });
  return space.id;
}

function installation(
  organizationId: string,
  spaceId: string,
  credentialRef: string | null,
): ConnectorInstallation {
  return {
    id: newId("cin"),
    organizationId,
    spaceId,
    connectorId: mockGoogleDrive.manifest.id,
    dataMode: "user_selected",
    status: "connected",
    credentialRef,
    grantedScopes: ["drive.readonly"],
    installedAt: new Date().toISOString(),
    revokedAt: null,
  };
}

describe("connector runtime (Drizzle-backed, on PGlite)", () => {
  let handle: DatabaseHandle;
  let runtime: ConnectorRuntime;

  // One PGlite instance for the whole file — every test uses unique org/user
  // ids so they don't collide, and this avoids WASM memory pressure from
  // spinning up a fresh instance per test.
  beforeAll(async () => {
    handle = await createTestDatabase();
    runtime = createConnectorRuntime({
      db: handle.db,
      connectors: [mockGoogleDrive],
      credentialKeys: KEYS,
    });
    await runtime.syncDefinitions();
  });
  afterAll(async () => {
    await handle.close();
  });

  it("persists an installation with hydrated scopes and the vault ref (never the secret)", async () => {
    const org = await makeOrg(handle, "usr_own1");
    const space = await makeSpace(handle, org);
    const ref = newId("cred");
    await runtime.vault.store(ref, "oauth-refresh-token-xyz");
    const inst = installation(org, space, ref);
    await runtime.installations.insert(inst);

    const loaded = await runtime.installations.get(inst.id);
    expect(loaded?.grantedScopes).toEqual(["drive.readonly"]);
    expect(loaded?.credentialRef).toBe(ref);
    // The secret is retrievable only through the vault, decrypted on demand.
    expect(await runtime.vault.retrieve(ref)).toBe("oauth-refresh-token-xyz");
  });

  it("revocation destroys the credential and marks the installation revoked", async () => {
    const org = await makeOrg(handle, "usr_own2");
    const space = await makeSpace(handle, org);
    const ref = newId("cred");
    await runtime.vault.store(ref, "secret-token");
    const inst = installation(org, space, ref);
    await runtime.installations.insert(inst);

    await runtime.gateway.revoke(inst.id);

    const after = await runtime.installations.get(inst.id);
    expect(after?.status).toBe("revoked");
    expect(after?.credentialRef).toBeNull();
    expect(after?.revokedAt).not.toBeNull();
    // Credential is gone from the vault.
    expect(await runtime.vault.retrieve(ref)).toBeNull();
  });

  it("listByOrganization never leaks another org's installations", async () => {
    const orgA = await makeOrg(handle, "usr_a");
    const spaceA = await makeSpace(handle, orgA);
    const orgB = await makeOrg(handle, "usr_b");
    const spaceB = await makeSpace(handle, orgB);

    const instA = installation(orgA, spaceA, null);
    const instB = installation(orgB, spaceB, null);
    await runtime.installations.insert(instA);
    await runtime.installations.insert(instB);

    const listedA = await runtime.installations.listByOrganization(orgA);
    expect(listedA.map((i) => i.id)).toEqual([instA.id]);
    const listedB = await runtime.installations.listByOrganization(orgB);
    expect(listedB.map((i) => i.id)).toEqual([instB.id]);
  });

  it("connect: an OAuth connector seals a token and the installation keeps the ref", async () => {
    const org = await makeOrg(handle, "usr_conn");
    const space = await makeSpace(handle, org);
    const rt = createConnectorRuntime({
      db: handle.db,
      connectors: [sealingConnector],
      credentialKeys: KEYS,
    });
    await rt.syncDefinitions();

    const inst = await rt.gateway.connect({
      organizationId: org,
      spaceId: space,
      connectorId: "test-sealing",
      dataMode: "user_selected",
      credential: "auth-code-abc",
    });
    expect(inst.status).toBe("connected");
    expect(inst.credentialRef).toMatch(/^cred_/);
    expect(inst.grantedScopes).toEqual(["files.readonly"]);
    // The sealed token round-trips through the vault; ciphertext is decrypted on read.
    expect(await rt.vault.retrieve(inst.credentialRef!)).toBe("token-for:auth-code-abc");
    // Persisted and revocable.
    expect((await rt.installations.get(inst.id))?.status).toBe("connected");
  });

  it("connect: a mock connector seals nothing, so no dangling credential ref", async () => {
    const org = await makeOrg(handle, "usr_mock");
    const space = await makeSpace(handle, org);
    const inst = await runtime.gateway.connect({
      organizationId: org,
      spaceId: space,
      connectorId: mockGoogleDrive.manifest.id,
      dataMode: "user_selected",
      credential: null,
    });
    expect(inst.status).toBe("mock");
    expect(inst.credentialRef).toBeNull();
  });

  it("import: a fetched connector item becomes a connector_item source with pending suggestions", async () => {
    const env = createDbEnvironment(handle.db);
    const org = await makeOrg(handle, "usr_imp");
    const space = await makeSpace(handle, org);
    const actor = userActor("usr_imp");

    const inst = await runtime.gateway.connect({
      organizationId: org,
      spaceId: space,
      connectorId: mockGoogleDrive.manifest.id,
      dataMode: "user_selected",
      credential: null,
    });
    // Fetch a real item through the capability-enforced Gateway, then import it.
    const item = await runtime.gateway.fetch(inst.id, "doc-brand-guide");
    const result = await env.importConnectorItem(actor, { item, installationId: inst.id });

    expect(result.source.kind).toBe("connector_item");
    expect(result.source.connectorInstallationId).toBe(inst.id);
    expect(result.source.authority).toBe("connected_system");
    // Extraction yields review candidates — pending only, never auto-approved.
    expect(result.suggestions.every((s) => s.status === "pending")).toBe(true);
    // The source is persisted and Space-scoped.
    const sources = await env.store.listSpaceSources(space);
    expect(sources.map((s) => s.id)).toContain(result.source.id);
  });

  it("rotates stored credentials onto a new key version and still decrypts", async () => {
    const org = await makeOrg(handle, "usr_rot");
    const space = await makeSpace(handle, org);
    const ref = newId("cred");
    await runtime.vault.store(ref, "rotate-me");
    await runtime.installations.insert(installation(org, space, ref));

    // A runtime with an added higher key version rotates the DB rows onto v2.
    const v2Key = `v2:${generateCredentialKey()}`;
    const rotated = createConnectorRuntime({
      db: handle.db,
      connectors: [mockGoogleDrive],
      credentialKeys: `${KEYS},${v2Key}`,
    });
    const summary = await rotated.vault.rotate();
    // At least this secret was re-sealed (other tests share the DB, so don't
    // assert an exact count); it still decrypts after rotation.
    expect(summary.rotated).toBeGreaterThanOrEqual(1);
    expect(await rotated.vault.retrieve(ref)).toBe("rotate-me");

    // Proof it is now on v2: a v2-ONLY runtime (no v1 key) can still open it.
    const v2Only = createConnectorRuntime({
      db: handle.db,
      connectors: [mockGoogleDrive],
      credentialKeys: v2Key,
    });
    expect(await v2Only.vault.retrieve(ref)).toBe("rotate-me");
  });
});
