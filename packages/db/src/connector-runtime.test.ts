import { newId, type ConnectorInstallation } from "@continuum/contracts";
import { mockGoogleDrive } from "@continuum/connectors";
import { generateCredentialKey } from "@continuum/integrations";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, type DatabaseHandle } from "./client.js";
import { createConnectorRuntime, type ConnectorRuntime } from "./connector-runtime.js";
import { createTenancyRepository } from "./repositories/tenancy.js";
import { users } from "./schema/index.js";

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

  beforeEach(async () => {
    handle = await createTestDatabase();
    runtime = createConnectorRuntime({
      db: handle.db,
      connectors: [mockGoogleDrive],
      credentialKeys: KEYS,
    });
    await runtime.syncDefinitions();
  });
  afterEach(async () => {
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

  it("rotates stored credentials onto a new key version and still decrypts", async () => {
    const org = await makeOrg(handle, "usr_rot");
    const space = await makeSpace(handle, org);
    const ref = newId("cred");
    await runtime.vault.store(ref, "rotate-me");
    await runtime.installations.insert(installation(org, space, ref));

    // A runtime with an added higher key version rotates the same DB rows.
    const rotated = createConnectorRuntime({
      db: handle.db,
      connectors: [mockGoogleDrive],
      credentialKeys: `${KEYS},v2:${generateCredentialKey()}`,
    });
    const summary = await rotated.vault.rotate();
    expect(summary.rotated).toBe(1);
    expect(await rotated.vault.retrieve(ref)).toBe("rotate-me");
  });
});
