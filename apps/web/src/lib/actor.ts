import "server-only";
import { headers } from "next/headers";
import { sessionActor, type Actor } from "@continuum/auth";
import { auth } from "./auth";

/** The current Better Auth session (server-only), or null when signed out. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Resolve the current authenticated user to a Continuum {@link Actor}, or null.
 * The Actor is the ONLY thing services accept — authorization is still enforced
 * by the policy layer, so obtaining an Actor never grants resource access.
 */
export async function getCurrentActor(): Promise<Actor | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return sessionActor(session.user.id, "web_app");
}

/** Like {@link getCurrentActor} but throws when unauthenticated (route guards). */
export async function requireActor(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) throw new Error("unauthenticated");
  return actor;
}
