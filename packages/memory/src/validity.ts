import type { Memory } from "@continuum/contracts";

/**
 * A memory is active — eligible for retrieval — only when it is approved,
 * not deleted, and inside its validity window. Rejected, expired, superseded,
 * deleted, or unauthorized memories must never appear in normal retrieval
 * (spec §10).
 */
export function isMemoryActive(memory: Memory, now: Date): boolean {
  if (memory.status !== "approved") return false;
  if (memory.deletedAt) return false;
  if (memory.validFrom && new Date(memory.validFrom) > now) return false;
  if (memory.validUntil && new Date(memory.validUntil) < now) return false;
  return true;
}

/** Why a memory is excluded from retrieval, for Context Receipts. */
export function inactiveReason(
  memory: Memory,
  now: Date,
): "rejected" | "expired" | "superseded" | "deleted" | "unapproved" | null {
  if (memory.deletedAt) return "deleted";
  if (memory.status === "rejected") return "rejected";
  if (memory.status === "superseded") return "superseded";
  if (memory.status === "deleted") return "deleted";
  if (memory.status === "expired") return "expired";
  if (memory.validUntil && new Date(memory.validUntil) < now) return "expired";
  if (memory.validFrom && new Date(memory.validFrom) > now) return "unapproved";
  if (memory.status === "proposed") return "unapproved";
  return null;
}
