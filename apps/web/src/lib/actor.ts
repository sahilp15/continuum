import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sessionActor, type Actor } from "@continuum/auth";
import { auth } from "./auth";

/**
 * The current Better Auth session (server-only), or null when signed out.
 * Fails safe: a malformed/expired cookie or a transient session-lookup error is
 * treated as "signed out" (null) rather than throwing — so a stale session can
 * never blank a protected page; it just routes the user back to sign-in.
 */
export async function getSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
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

/**
 * Resolve the current Actor, or **clear the stale session and redirect to
 * sign-in** when the session is missing/expired (e.g. after a dev restart clears
 * the in-memory DB, leaving a signed-but-orphaned cookie). We route through
 * `/api/session/reset` rather than straight to `/sign-in` so the stale cookie is
 * actually removed — otherwise the edge middleware still sees a "present" cookie
 * and the two layers ping-pong into a redirect loop. Redirecting (rather than
 * throwing) avoids an uncaught error that would blank the page; `redirect()`
 * throws NEXT_REDIRECT, which Next handles.
 */
export async function requireActor(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/api/session/reset");
  return actor;
}
