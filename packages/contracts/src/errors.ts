/**
 * Structured errors used across services, the API, and MCP tools.
 *
 * `not_found` is deliberately used for authorization failures on specific
 * resources: unauthorized callers must not be able to infer that another
 * Space, Project, or memory exists (spec §25.5).
 */
export const CONTINUUM_ERROR_CODES = [
  "not_found",
  "unauthorized",
  "forbidden",
  "invalid_input",
  "conflict",
  "rate_limited",
  "connector_unavailable",
  "internal",
] as const;

export type ContinuumErrorCode = (typeof CONTINUUM_ERROR_CODES)[number];

export class ContinuumError extends Error {
  readonly code: ContinuumErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ContinuumErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ContinuumError";
    this.code = code;
    this.details = details;
  }
}

/** Resource-hiding helper: identical error whether a resource is missing or merely unauthorized. */
export function notFound(resource: string): ContinuumError {
  return new ContinuumError("not_found", `${resource} not found`);
}
