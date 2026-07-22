import "server-only";
import type { Actor } from "@continuum/auth";
import {
  createDbEnvironment,
  createOnboardingRepository,
  type DbEnvironment,
  type OnboardingRepository,
} from "@continuum/db";
import { requireActor } from "./actor";
import { db } from "./db";

/**
 * The DB-backed Continuum environment (production counterpart to Demo Mode's
 * in-memory env). Cached per process; services are stateless and take the Actor
 * per call, so authorization is always enforced.
 */
const globalStore = globalThis as unknown as {
  __continuumEnv?: DbEnvironment;
  __continuumOnboarding?: OnboardingRepository;
};

export function getEnv(): DbEnvironment {
  return (globalStore.__continuumEnv ??= createDbEnvironment(db));
}

export function getOnboarding(): OnboardingRepository {
  return (globalStore.__continuumOnboarding ??= createOnboardingRepository(db));
}

/** Require an authenticated Actor and return it with the DB environment. */
export async function requireActorAndEnv(): Promise<{ actor: Actor; env: DbEnvironment }> {
  const actor = await requireActor();
  return { actor, env: getEnv() };
}
