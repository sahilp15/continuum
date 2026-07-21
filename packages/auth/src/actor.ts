import type { RequestingIntegration, Sensitivity } from "@continuum/contracts";

/**
 * An authenticated actor. Every service call receives one — services never
 * accept bare user IDs, so authorization context cannot be forgotten.
 */
export interface Actor {
  kind: "user" | "integration" | "system";
  userId: string;
  /** Which surface the request arrived through. */
  integration: RequestingIntegration;
  /** Highest sensitivity level this actor's surface may receive. */
  sensitivityAllowance: Sensitivity;
}

export function userActor(
  userId: string,
  integration: RequestingIntegration = "web_app",
  sensitivityAllowance: Sensitivity = "confidential",
): Actor {
  return { kind: "user", userId, integration, sensitivityAllowance };
}
