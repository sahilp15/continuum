#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLogger } from "@continuum/observability";
import { createDemoEnvironment } from "@continuum/evals";
import { resolveActorFromEnv } from "./auth.js";
import { createContinuumMcpServer } from "./server.js";

const logger = createLogger({
  name: "continuum-mcp",
  // stdout is the MCP transport; logs must go to stderr.
  sink: (line) => process.stderr.write(`${line}\n`),
});

async function main(): Promise<void> {
  const actor = resolveActorFromEnv(process.env);
  const env = createDemoEnvironment();
  const server = createContinuumMcpServer(env, actor);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Continuum MCP server running on stdio (demo mode)");
}

main().catch((error) => {
  logger.error("MCP server failed to start", { error: String(error) });
  process.exit(1);
});
