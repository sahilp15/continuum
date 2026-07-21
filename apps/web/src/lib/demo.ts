import { createDemoEnvironment, type DemoEnvironment } from "@continuum/evals";
import { userActor, type Actor } from "@continuum/auth";
import { demoUsers } from "@continuum/testing";

/**
 * Demo mode: one deterministic in-memory environment per server process, so
 * actions (approving a suggestion, running preflight) persist across requests
 * during a session. Real persistence lands with the Phase 1/2 database wiring.
 */
const globalStore = globalThis as unknown as { __continuumDemoEnv?: DemoEnvironment };

export function getDemoEnvironment(): DemoEnvironment {
  globalStore.__continuumDemoEnv ??= createDemoEnvironment();
  return globalStore.__continuumDemoEnv;
}

/** The signed-in demo user. Auth flows replace this in Phase 1. */
export function getDemoActor(): Actor {
  return userActor(demoUsers.freelancer.id, "web_app");
}
