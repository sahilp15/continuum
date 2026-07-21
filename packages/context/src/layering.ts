import type { Memory, PrecedenceLayer } from "@continuum/contracts";

/**
 * Map a memory to its deterministic precedence layer (spec §5).
 * Project-scoped facts/decisions/deadlines outrank Space-level facts;
 * Space rules outrank everything a user might personally prefer.
 */
export function layerForMemory(memory: Memory): PrecedenceLayer {
  switch (memory.type) {
    case "compliance_rule":
      return "space_compliance_rule";
    case "hard_rule":
    case "terminology":
      return "space_hard_rule";
    case "audience":
    case "voice":
      return "space_audience_voice";
    case "example":
    case "anti_example":
      return "historical_example";
    case "preference":
      return "personal_preference";
    default:
      return memory.projectId ? "project_fact" : "space_approved_fact";
  }
}

/** Rough token estimate (chars/4) used for budgeting. Deliberately simple and deterministic. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
