import { ContinuumError } from "@continuum/contracts";
import { userActor, type Actor } from "@continuum/auth";
import { demoUsers } from "@continuum/testing";

/**
 * MCP authentication (spec §23.1).
 *
 * Production deployments must use standards-based OAuth for remote MCP.
 * Local development supports a dev-token mode that is IMPOSSIBLE to enable in
 * production: it hard-fails when NODE_ENV is "production" regardless of
 * configuration, and it never falls back to an implicit identity.
 */
export function resolveActorFromEnv(env: NodeJS.ProcessEnv): Actor {
  if (env.NODE_ENV === "production") {
    throw new ContinuumError(
      "unauthorized",
      "dev-token authentication is disabled in production; configure OAuth for remote MCP",
    );
  }
  const token = env.CONTINUUM_MCP_DEV_TOKEN;
  if (!token || token.length < 12) {
    throw new ContinuumError(
      "unauthorized",
      "set CONTINUUM_MCP_DEV_TOKEN (min 12 chars) in .env to run the local MCP server",
    );
  }
  // Local dev token maps to the demo freelancer; MCP is a lower-trust surface
  // so its default sensitivity allowance is capped at confidential.
  return userActor(demoUsers.freelancer.id, "mcp", "confidential");
}
