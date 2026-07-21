import { newId, type Memory, type Source, type Suggestion } from "@continuum/contracts";
import { isMemoryActive } from "./validity.js";

/**
 * Deterministic candidate extraction (spec §9 layer 2, §11, §25).
 *
 * Imported text is strictly DATA. Nothing in a source can trigger behavior:
 * extraction only ever produces `pending` suggestions for human review, and
 * instruction-like content is additionally flagged so the review UI can warn
 * the user. There is no code path from source text to approved memory.
 */

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?(prior|previous)\s+(instructions|rules)/i,
  /reveal\s+.{0,40}(other\s+spaces?|system\s+prompt|credentials|secrets)/i,
  /automatically\s+approve/i,
  /send\s+.{0,60}(files|data|credentials)\s+to\s+/i,
  /you\s+are\s+now\s+/i,
  /new\s+system\s+prompt/i,
];

export function detectInjectionAttempt(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const DATE_PATTERN = new RegExp(`\\b(${MONTHS})\\s+(\\d{1,2})\\b`, "gi");
const DEADLINE_HINT = /(deadline|due|launch(es|ing)?|ships?|goes live|review)/i;

export interface ExtractionResult {
  suggestions: Suggestion[];
  /** True when the source contained instruction-like content. */
  injectionSuspected: boolean;
}

/**
 * Extract candidate memories from a source. `existingMemories` must already be
 * scoped to the source's Space by the caller — extraction never looks across
 * Spaces.
 */
export function extractCandidates(
  source: Source,
  existingMemories: Memory[],
  now: Date,
): ExtractionResult {
  const injectionSuspected = detectInjectionAttempt(source.content);
  const suggestions: Suggestion[] = [];
  const timestamp = now.toISOString();

  // Deadline / date extraction: sentences that mention a date alongside a
  // scheduling hint become low-friction candidates.
  const sentences = source.content.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    if (!DEADLINE_HINT.test(sentence)) continue;
    // Skip instruction-like sentences entirely: they are never promoted to
    // candidates, only surfaced via the injection flag.
    if (detectInjectionAttempt(sentence)) continue;
    const dates = [...sentence.matchAll(DATE_PATTERN)];
    if (dates.length === 0) continue;

    // Prefer a date that is not negated ("March 21, not March 14" → March 21).
    // Purely a heuristic; the user always reviews before anything is saved.
    const affirmed = dates.filter((match) => {
      const before = sentence.slice(Math.max(0, (match.index ?? 0) - 12), match.index ?? 0);
      return !/\bnot\s*$/i.test(before);
    });
    const chosen = affirmed[affirmed.length - 1] ?? dates[dates.length - 1];
    if (!chosen) continue;
    const proposedDate = `${chosen[1]} ${chosen[2]}`;

    const conflicting = existingMemories.find(
      (m) =>
        m.type === "deadline" && isMemoryActive(m, now) && !m.canonicalText.includes(proposedDate),
    );

    suggestions.push({
      id: newId("sug"),
      organizationId: source.organizationId,
      spaceId: source.spaceId,
      projectId: conflicting?.projectId ?? null,
      memoryType: "deadline",
      title: `Possible deadline: ${proposedDate}`,
      proposedText: sentence.trim(),
      structuredValue: { dateText: proposedDate },
      conflictsWithMemoryId: conflicting?.id ?? null,
      previousValueText: conflicting?.canonicalText ?? null,
      sourceId: source.id,
      sourceExcerpt: sentence.trim().slice(0, 500),
      confidence: injectionSuspected ? 0.3 : conflicting ? 0.85 : 0.6,
      rationale: conflicting
        ? "A statement in this source conflicts with an approved deadline."
        : "This source mentions a date next to scheduling language.",
      suggestedExpiresAt: null,
      status: "pending",
      createdAt: timestamp,
      resolvedAt: null,
      resolvedBy: null,
    });
  }

  return { suggestions, injectionSuspected };
}
