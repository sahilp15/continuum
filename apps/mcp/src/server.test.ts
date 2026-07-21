import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { userActor } from "@continuum/auth";
import { createDemoEnvironment } from "@continuum/evals";
import { demoSpaces, demoUsers } from "@continuum/testing";
import { resolveActorFromEnv } from "./auth.js";
import { createContinuumMcpServer } from "./server.js";

async function connectedClient(actorUserId: string) {
  const env = createDemoEnvironment(() => new Date("2026-03-12T12:00:00.000Z"));
  const server = createContinuumMcpServer(env, userActor(actorUserId, "mcp"));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.1" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function textOf(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content as Array<{ type: string; text?: string }>;
  return content.map((c) => c.text ?? "").join("\n");
}

describe("MCP server", () => {
  it("dev-token auth can never run in production", () => {
    expect(() =>
      resolveActorFromEnv({
        NODE_ENV: "production",
        CONTINUUM_MCP_DEV_TOKEN: "supersecrettoken",
      } as NodeJS.ProcessEnv),
    ).toThrowError(/disabled in production/);
  });

  it("returns Northbank context with a receipt for an authorized actor", async () => {
    const client = await connectedClient(demoUsers.freelancer.id);
    const result = await client.callTool({
      name: "continuum_get_context",
      arguments: { spaceId: demoSpaces.northbank.id, task: "write the March newsletter" },
    });
    const text = textOf(result);
    expect(text).toContain("Rules (binding)");
    expect(text).toContain("March 21");
    expect(text).not.toMatch(/fizzpop/i);
    expect(text).toContain("receipt");
  });

  it("blocks unauthorized actors without revealing the space exists", async () => {
    const client = await connectedClient(demoUsers.outsider.id);
    const result = await client.callTool({
      name: "continuum_get_context",
      arguments: { spaceId: demoSpaces.northbank.id, task: "anything" },
    });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("not_found");
    expect(textOf(result)).not.toMatch(/northbank/i);
  });

  it("only lists spaces the actor can access", async () => {
    const client = await connectedClient(demoUsers.freelancer.id);
    const result = await client.callTool({ name: "continuum_list_spaces", arguments: {} });
    const text = textOf(result);
    expect(text).toContain("Northbank");
    expect(text).toContain("FizzPop");
    expect(text).not.toContain("Elsewhere Client");
  });

  it("runs preflight through MCP and catches a Northbank joke", async () => {
    const client = await connectedClient(demoUsers.freelancer.id);
    const result = await client.callTool({
      name: "continuum_check_output",
      arguments: {
        spaceId: demoSpaces.northbank.id,
        content: "Why did the CFO cross the road? Northbank Flex is here!",
      },
    });
    const text = textOf(result);
    expect(text).toContain('"passed": false');
    expect(text).toContain("banned_terminology");
  });
});
