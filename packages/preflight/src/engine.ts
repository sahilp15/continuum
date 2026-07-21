import {
  newId,
  type Memory,
  type PreflightFinding,
  type PreflightResult,
  type Space,
} from "@continuum/contracts";
import { isMemoryActive } from "@continuum/memory";

/**
 * Deterministic preflight engine (spec §24). Every check derives from the
 * Space's APPROVED memory — there are no hardcoded client rules. Findings are
 * never presented as legal or compliance conclusions.
 */

const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

/** Deterministic humor/slang markers used when a Space bans jokes or slang. */
const JOKE_MARKERS: RegExp[] = [
  /\bknock knock\b/i,
  /walks? into a bar/i,
  /\bwhy did the\b/i,
  /\bjust kidding\b/i,
  /\bjk\b/i,
  /\blol\b/i,
  /\blmao\b/i,
  /\bhaha+\b/i,
  /\bfunny story\b/i,
];

const SLANG_MARKERS: RegExp[] = [
  /\bgonna\b/i,
  /\bwanna\b/i,
  /\bgotta\b/i,
  /\bvibes?\b/i,
  /\blit\b/i,
  /\bfam\b/i,
  /\bno cap\b/i,
  /\btotally awesome\b/i,
];

function excerptAround(content: string, index: number, length: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + length + 40);
  return `${start > 0 ? "…" : ""}${content.slice(start, end)}${end < content.length ? "…" : ""}`;
}

function findMarker(content: string, patterns: RegExp[]): { index: number; match: string } | null {
  for (const pattern of patterns) {
    const match = pattern.exec(content);
    if (match) return { index: match.index, match: match[0] };
  }
  return null;
}

interface RuleContext {
  memory: Memory;
  finding: (partial: Omit<PreflightFinding, "deterministic" | "confidence">) => PreflightFinding;
}

function checkStyleFlags(content: string, ctx: RuleContext): PreflightFinding[] {
  const flags = (ctx.memory.structuredValue?.styleFlags ?? []) as string[];
  const findings: PreflightFinding[] = [];

  if (flags.includes("no_jokes")) {
    const marker = findMarker(content, JOKE_MARKERS);
    if (marker) {
      findings.push(
        ctx.finding({
          severity: "error",
          category: "banned_terminology",
          explanation: `This Space prohibits jokes, but the draft contains humor marker "${marker.match}".`,
          excerpt: excerptAround(content, marker.index, marker.match.length),
          violatedRuleMemoryId: ctx.memory.id,
          violatedRuleText: ctx.memory.canonicalText,
          ruleSource: ctx.memory.title,
          suggestedCorrection: "Remove the humor and restate the point directly.",
        }),
      );
    }
  }
  if (flags.includes("no_slang")) {
    const marker = findMarker(content, SLANG_MARKERS);
    if (marker) {
      findings.push(
        ctx.finding({
          severity: "error",
          category: "banned_terminology",
          explanation: `This Space prohibits slang, but the draft contains "${marker.match}".`,
          excerpt: excerptAround(content, marker.index, marker.match.length),
          violatedRuleMemoryId: ctx.memory.id,
          violatedRuleText: ctx.memory.canonicalText,
          ruleSource: ctx.memory.title,
          suggestedCorrection: "Replace slang with plain professional language.",
        }),
      );
    }
  }
  if (flags.includes("no_emojis")) {
    const match = EMOJI_PATTERN.exec(content);
    if (match) {
      findings.push(
        ctx.finding({
          severity: "error",
          category: "banned_terminology",
          explanation: "This Space prohibits emojis, but the draft contains one.",
          excerpt: excerptAround(content, match.index, match[0].length),
          violatedRuleMemoryId: ctx.memory.id,
          violatedRuleText: ctx.memory.canonicalText,
          ruleSource: ctx.memory.title,
          suggestedCorrection: "Remove the emoji.",
        }),
      );
    }
  }
  return findings;
}

function checkBannedPhrases(content: string, ctx: RuleContext): PreflightFinding[] {
  const phrases = (ctx.memory.structuredValue?.bannedPhrases ?? []) as string[];
  const findings: PreflightFinding[] = [];
  const lower = content.toLowerCase();
  for (const phrase of phrases) {
    const index = lower.indexOf(phrase.toLowerCase());
    if (index >= 0) {
      findings.push(
        ctx.finding({
          severity: "blocker",
          category: "prohibited_claim",
          explanation: `The draft uses the prohibited phrase "${phrase}".`,
          excerpt: excerptAround(content, index, phrase.length),
          violatedRuleMemoryId: ctx.memory.id,
          violatedRuleText: ctx.memory.canonicalText,
          ruleSource: ctx.memory.title,
          suggestedCorrection: `Remove or rephrase "${phrase}".`,
        }),
      );
    }
  }
  return findings;
}

function checkRequiredDisclaimer(content: string, ctx: RuleContext): PreflightFinding[] {
  const value = ctx.memory.structuredValue ?? {};
  const disclaimer = value.requiredDisclaimer as string | undefined;
  const triggers = (value.disclaimerTriggers ?? []) as string[];
  if (!disclaimer || triggers.length === 0) return [];
  const lower = content.toLowerCase();
  const triggered = triggers.some((t) => lower.includes(t.toLowerCase()));
  if (!triggered || lower.includes(disclaimer.toLowerCase())) return [];
  return [
    ctx.finding({
      severity: "error",
      category: "missing_disclaimer",
      explanation: "The draft discusses a regulated topic but omits the required disclaimer.",
      excerpt: "",
      violatedRuleMemoryId: ctx.memory.id,
      violatedRuleText: ctx.memory.canonicalText,
      ruleSource: ctx.memory.title,
      suggestedCorrection: `Append: "${disclaimer}"`,
    }),
  ];
}

function checkExactName(content: string, ctx: RuleContext): PreflightFinding[] {
  const value = ctx.memory.structuredValue ?? {};
  const exactName = value.exactName as string | undefined;
  const bannedVariants = (value.bannedVariants ?? []) as string[];
  if (!exactName) return [];
  const findings: PreflightFinding[] = [];
  for (const variant of bannedVariants) {
    // Case-sensitive scan: the variants differ from the exact name by casing.
    const index = content.indexOf(variant);
    if (index >= 0 && variant !== exactName) {
      findings.push(
        ctx.finding({
          severity: "error",
          category: "exact_name_rule",
          explanation: `Product name must be written exactly as "${exactName}", found "${variant}".`,
          excerpt: excerptAround(content, index, variant.length),
          violatedRuleMemoryId: ctx.memory.id,
          violatedRuleText: ctx.memory.canonicalText,
          ruleSource: ctx.memory.title,
          suggestedCorrection: `Replace with "${exactName}".`,
        }),
      );
    }
  }
  return findings;
}

function checkOutdatedDates(content: string, ctx: RuleContext): PreflightFinding[] {
  const superseded = (ctx.memory.structuredValue?.supersededValues ?? []) as string[];
  const findings: PreflightFinding[] = [];
  for (const oldValue of superseded) {
    const index = content.toLowerCase().indexOf(oldValue.toLowerCase());
    if (index >= 0) {
      findings.push(
        ctx.finding({
          severity: "error",
          category: "outdated_date",
          explanation: `The draft references "${oldValue}", which was superseded. Current: ${ctx.memory.canonicalText}`,
          excerpt: excerptAround(content, index, oldValue.length),
          violatedRuleMemoryId: ctx.memory.id,
          violatedRuleText: ctx.memory.canonicalText,
          ruleSource: ctx.memory.title,
          suggestedCorrection: `Update to match: ${ctx.memory.canonicalText}`,
        }),
      );
    }
  }
  return findings;
}

export interface PreflightInput {
  space: Space;
  /** Space-scoped memories; the engine filters to active ones itself. */
  memories: Memory[];
  /** Names of the user's OTHER Spaces, for cross-contamination detection. */
  otherSpaceNames: string[];
  content: string;
  now?: Date;
}

export function runPreflight(input: PreflightInput): PreflightResult {
  const now = input.now ?? new Date();
  const findings: PreflightFinding[] = [];
  const active = input.memories.filter(
    (m) => m.spaceId === input.space.id && isMemoryActive(m, now),
  );

  for (const memory of active) {
    const ctx: RuleContext = {
      memory,
      finding: (partial) => ({ ...partial, deterministic: true, confidence: 1 }),
    };
    findings.push(...checkStyleFlags(input.content, ctx));
    findings.push(...checkBannedPhrases(input.content, ctx));
    findings.push(...checkRequiredDisclaimer(input.content, ctx));
    findings.push(...checkExactName(input.content, ctx));
    findings.push(...checkOutdatedDates(input.content, ctx));
  }

  // Cross-Space contamination: another client's name in this Space's draft is
  // always worth a warning (spec §24 "accidental mention of another Space").
  for (const otherName of input.otherSpaceNames) {
    if (otherName.length < 3 || otherName === input.space.name) continue;
    const index = input.content.toLowerCase().indexOf(otherName.toLowerCase());
    if (index >= 0) {
      findings.push({
        severity: "warning",
        category: "cross_space_mention",
        explanation: `The draft mentions "${otherName}", which is a different Space. Check for cross-client contamination.`,
        excerpt: excerptAround(input.content, index, otherName.length),
        violatedRuleMemoryId: null,
        violatedRuleText: null,
        ruleSource: "Space isolation",
        suggestedCorrection: null,
        confidence: 0.8,
        deterministic: true,
      });
    }
  }

  const severityRank = { info: 0, warning: 1, error: 2, blocker: 3 } as const;
  findings.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  return {
    id: newId("pfc"),
    spaceId: input.space.id,
    checkedAt: now.toISOString(),
    findings,
    passed: !findings.some((f) => f.severity === "error" || f.severity === "blocker"),
  };
}
