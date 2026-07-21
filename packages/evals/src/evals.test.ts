import { describe, expect, it } from "vitest";
import { coreEvalFixtures } from "./fixtures.js";
import { runEvalSuite } from "./runner.js";

describe("core retrieval evals", () => {
  it("all fixtures pass with zero cross-space contamination", async () => {
    const suite = await runEvalSuite(coreEvalFixtures);
    for (const result of suite.results) {
      expect(result.failures, result.name).toEqual([]);
      expect(result.requiredRuleRecall, result.name).toBe(1);
    }
    // Release-blocking invariant (spec §41): contamination must be zero.
    expect(suite.totalContamination).toBe(0);
    expect(suite.allPassed).toBe(true);
  });
});
