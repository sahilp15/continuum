import { beforeEach, describe, expect, it } from "vitest";
import {
  createConnectorGateway,
  createConnectorRegistry,
  createInMemoryInstallationStore,
  type ConnectorGateway,
  type InstallationStore,
} from "@continuum/connectors-core";
import { createInMemoryCredentialVault } from "@continuum/integrations";
import { createLogger } from "@continuum/observability";
import { allMockConnectors, mockSlack } from "./index.js";

const logger = createLogger({ name: "test", sink: () => undefined });

describe("connector gateway with mock connectors", () => {
  let gateway: ConnectorGateway;
  let installations: InstallationStore;
  let audits: Array<Record<string, unknown>>;

  beforeEach(async () => {
    const registry = createConnectorRegistry();
    for (const connector of allMockConnectors) registry.register(connector);
    installations = createInMemoryInstallationStore();
    audits = [];
    await installations.insert({
      id: "cin_slack_test000001",
      organizationId: "org_demo_studio000001",
      spaceId: "spc_northbank00000001",
      connectorId: mockSlack.manifest.id,
      dataMode: "live_only",
      status: "mock",
      credentialRef: "cred_slack_1",
      grantedScopes: [],
      installedAt: new Date().toISOString(),
      revokedAt: null,
    });
    gateway = createConnectorGateway({
      registry,
      installations,
      vault: createInMemoryCredentialVault(),
      logger,
      audit: { record: (e) => audits.push(e) },
    });
  });

  it("all mock manifests validate", () => {
    // Registration already parses each manifest; reaching here means they passed.
    expect(allMockConnectors).toHaveLength(6);
  });

  it("searches through the gateway and audits the call", async () => {
    const result = await gateway.search("cin_slack_test000001", { query: "deadline" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Slack message from Priya");
    expect(audits.some((a) => a.action === "connector.search")).toBe(true);
  });

  it("rejects undeclared capabilities", async () => {
    // The mock Slack connector does not declare `send`.
    await expect(
      gateway.executeAction("cin_slack_test000001", {
        action: "post_message",
        capability: "send",
        payload: {},
        confirmed: true,
        idempotencyKey: "k1",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("requires confirmation and idempotency for external writes", async () => {
    const registry = createConnectorRegistry();
    // A hypothetical connector that declares send.
    const sender = {
      ...mockSlack,
      manifest: {
        ...mockSlack.manifest,
        id: "mock-slack-sender",
        capabilities: [...mockSlack.manifest.capabilities, "send" as const],
      },
    };
    registry.register(sender);
    await installations.insert({
      id: "cin_sender_test00001",
      organizationId: "org_demo_studio000001",
      spaceId: null,
      connectorId: "mock-slack-sender",
      dataMode: "live_only",
      status: "mock",
      credentialRef: null,
      grantedScopes: [],
      installedAt: new Date().toISOString(),
      revokedAt: null,
    });
    const sendingGateway = createConnectorGateway({
      registry,
      installations,
      vault: createInMemoryCredentialVault(),
      logger,
      audit: { record: (e) => audits.push(e) },
    });

    await expect(
      sendingGateway.executeAction("cin_sender_test00001", {
        action: "post_message",
        capability: "send",
        payload: {},
      }),
    ).rejects.toMatchObject({ code: "forbidden" });

    const first = await sendingGateway.executeAction("cin_sender_test00001", {
      action: "post_message",
      capability: "send",
      payload: { text: "hello" },
      confirmed: true,
      idempotencyKey: "abc",
    });
    expect(first.status).toBe("executed");

    // Retry with the same key is suppressed — no duplicate external write.
    const retry = await sendingGateway.executeAction("cin_sender_test00001", {
      action: "post_message",
      capability: "send",
      payload: { text: "hello" },
      confirmed: true,
      idempotencyKey: "abc",
    });
    expect(retry.detail).toContain("duplicate suppressed");
  });

  it("revoked installations cannot be searched and credentials are destroyed", async () => {
    const vault = createInMemoryCredentialVault();
    await vault.store("cred_slack_1", "xoxb-secret");
    const registry = createConnectorRegistry();
    for (const connector of allMockConnectors) registry.register(connector);
    const revokingGateway = createConnectorGateway({
      registry,
      installations,
      vault,
      logger,
      audit: { record: (e) => audits.push(e) },
    });

    await revokingGateway.revoke("cin_slack_test000001");
    expect(await vault.retrieve("cred_slack_1")).toBeNull();
    await expect(
      revokingGateway.search("cin_slack_test000001", { query: "deadline" }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
