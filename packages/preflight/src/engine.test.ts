import { describe, expect, it } from "vitest";
import { createDemoDataset, demoSpaces } from "@continuum/testing";
import { runPreflight } from "./engine.js";

const NOW = new Date("2026-03-12T12:00:00.000Z");
const data = createDemoDataset();

function checkNorthbank(content: string) {
  return runPreflight({
    space: demoSpaces.northbank,
    memories: data.memories,
    otherSpaceNames: ["FizzPop"],
    content,
    now: NOW,
  });
}

function checkFizzpop(content: string) {
  return runPreflight({
    space: demoSpaces.fizzpop,
    memories: data.memories,
    otherSpaceNames: ["Northbank"],
    content,
    now: NOW,
  });
}

describe("Northbank preflight", () => {
  it("detects an intentionally inserted joke", () => {
    const result = checkNorthbank(
      "Our Q2 outlook is strong. Why did the CFO cross the road? To optimize the other side. " +
        "Northbank Flex helps you manage cash flow.",
    );
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.category === "banned_terminology")).toBe(true);
    const joke = result.findings.find((f) => f.category === "banned_terminology");
    expect(joke?.deterministic).toBe(true);
    expect(joke?.violatedRuleText).toContain("jokes");
  });

  it("blocks guaranteed-returns claims", () => {
    const result = checkNorthbank("Northbank Flex offers guaranteed returns for your business.");
    const blocker = result.findings.find((f) => f.severity === "blocker");
    expect(blocker?.category).toBe("prohibited_claim");
  });

  it("requires the financial disclaimer when investing is discussed", () => {
    const missing = checkNorthbank("Northbank Flex helps CFOs manage investing decisions.");
    expect(missing.findings.some((f) => f.category === "missing_disclaimer")).toBe(true);

    const present = checkNorthbank(
      "Northbank Flex helps CFOs manage investing decisions. " +
        "Investing involves risk. Past performance does not guarantee future results.",
    );
    expect(present.findings.some((f) => f.category === "missing_disclaimer")).toBe(false);
  });

  it("flags wrong product-name casing", () => {
    const result = checkNorthbank("Try NorthBank Flex today.");
    expect(result.findings.some((f) => f.category === "exact_name_rule")).toBe(true);
  });

  it("flags the superseded March 14 deadline", () => {
    const result = checkNorthbank("Reminder: the newsletter launches on March 14.");
    const outdated = result.findings.find((f) => f.category === "outdated_date");
    expect(outdated).toBeDefined();
    expect(outdated?.suggestedCorrection).toContain("March 21");
  });

  it("flags emoji use and cross-space mentions", () => {
    const result = checkNorthbank("Big news 🎉 — also loved working on FizzPop this week.");
    expect(result.findings.some((f) => f.explanation.includes("emojis"))).toBe(true);
    expect(result.findings.some((f) => f.category === "cross_space_mention")).toBe(true);
  });

  it("passes clean, compliant content", () => {
    const result = checkNorthbank(
      "Northbank Flex gives small-business CFOs precise cash-flow visibility. " +
        "The March newsletter launches on March 21.",
    );
    expect(result.passed).toBe(true);
  });
});

describe("FizzPop preflight", () => {
  it("permits playful language, emojis, and humor", () => {
    const result = checkFizzpop(
      "Cherry Blast just dropped 🍒🎉 Grab one before your 8am lecture. No cap, it slaps. lol",
    );
    // FizzPop has no no-jokes/no-slang/no-emoji rules, so nothing blocks.
    expect(result.passed).toBe(true);
  });

  it("still warns about Northbank contamination inside FizzPop drafts", () => {
    const result = checkFizzpop("Cherry Blast pairs great with Northbank Flex savings!");
    expect(result.findings.some((f) => f.category === "cross_space_mention")).toBe(true);
  });
});
