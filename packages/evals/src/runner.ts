import type { ContextRequest } from "@continuum/contracts";
import { userActor } from "@continuum/auth";
import { createDemoEnvironment } from "./demo-environment.js";

/**
 * Retrieval evaluation framework (spec §41). Each fixture states what a
 * compiled bundle MUST include, MUST exclude, and which Space's memory must
 * never leak in. Cross-Space contamination must always be zero.
 */
export interface EvalFixture {
  name: string;
  actorUserId: string;
  request: ContextRequest;
  expectIncludedMemoryIds: string[];
  expectExcludedMemoryIds: string[];
  /** Memory IDs from OTHER Spaces; any appearance is contamination. */
  forbiddenMemoryIds: string[];
  expectRuleTexts: string[];
}

export interface EvalResult {
  name: string;
  passed: boolean;
  requiredRuleRecall: number;
  retrievalPrecisionErrors: string[];
  contaminationCount: number;
  failures: string[];
}

export async function runEvalFixture(fixture: EvalFixture): Promise<EvalResult> {
  const env = createDemoEnvironment(() => new Date("2026-03-12T12:00:00.000Z"));
  const actor = userActor(fixture.actorUserId, fixture.request.requestingIntegration);
  const bundle = await env.compiler.compile(actor, fixture.request);
  const includedIds = new Set(bundle.items.map((i) => i.memoryId));
  const failures: string[] = [];

  for (const id of fixture.expectIncludedMemoryIds) {
    if (!includedIds.has(id)) failures.push(`missing expected memory ${id}`);
  }
  const precisionErrors: string[] = [];
  for (const id of fixture.expectExcludedMemoryIds) {
    if (includedIds.has(id)) {
      precisionErrors.push(id);
      failures.push(`included excluded memory ${id}`);
    }
  }
  let contaminationCount = 0;
  for (const id of fixture.forbiddenMemoryIds) {
    if (includedIds.has(id)) {
      contaminationCount += 1;
      failures.push(`CROSS-SPACE CONTAMINATION: ${id}`);
    }
  }

  const ruleTexts = bundle.receipt.rules.map((r) => r.text.toLowerCase());
  let rulesFound = 0;
  for (const expected of fixture.expectRuleTexts) {
    if (ruleTexts.some((t) => t.includes(expected.toLowerCase()))) {
      rulesFound += 1;
    } else {
      failures.push(`missing required rule: ${expected}`);
    }
  }

  return {
    name: fixture.name,
    passed: failures.length === 0,
    requiredRuleRecall:
      fixture.expectRuleTexts.length === 0 ? 1 : rulesFound / fixture.expectRuleTexts.length,
    retrievalPrecisionErrors: precisionErrors,
    contaminationCount,
    failures,
  };
}

export async function runEvalSuite(fixtures: EvalFixture[]): Promise<{
  results: EvalResult[];
  allPassed: boolean;
  totalContamination: number;
}> {
  const results: EvalResult[] = [];
  for (const fixture of fixtures) {
    results.push(await runEvalFixture(fixture));
  }
  return {
    results,
    allPassed: results.every((r) => r.passed),
    totalContamination: results.reduce((sum, r) => sum + r.contaminationCount, 0),
  };
}
