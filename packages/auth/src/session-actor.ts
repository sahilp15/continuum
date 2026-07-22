import type { RequestingIntegration } from "@continuum/contracts";
import { userActor, type Actor } from "./actor.js";

/**
 * Bridge an authenticated identity (owned by the auth layer — Better Auth in the
 * web app) to a Continuum {@link Actor} (the authorization context every service
 * requires). This is the sanctioned seam between authentication and
 * authorization: the auth layer proves *who* the user is; the Actor + policies in
 * this package still decide *what* they may access. A session never bypasses
 * authorization — it only ever produces an Actor, which the policy layer checks.
 */
export function sessionActor(
  userId: string,
  integration: RequestingIntegration = "web_app",
): Actor {
  if (!userId) {
    throw new Error("sessionActor requires an authenticated user id");
  }
  return userActor(userId, integration);
}
