import { describe, expect, it } from "vitest";
import {
  createInMemoryCredentialVault,
  createMockEmbeddingProvider,
  mockLLMProvider,
  mockSearchProvider,
} from "./index.js";

describe("mock providers", () => {
  it("mock LLM output is deterministic and clearly marked as mock", async () => {
    const a = await mockLLMProvider.complete({ system: "s", prompt: "hello" });
    const b = await mockLLMProvider.complete({ system: "s", prompt: "hello" });
    expect(a).toBe(b);
    expect(a).toContain("[mock-llm]");
  });

  it("mock embeddings are deterministic with fixed dimensions", async () => {
    const provider = createMockEmbeddingProvider(16);
    const [first] = await provider.embed(["northbank deadline"]);
    const [second] = await provider.embed(["northbank deadline"]);
    expect(first).toEqual(second);
    expect(first).toHaveLength(16);
  });

  it("credential vault stores and revokes secrets", async () => {
    const vault = createInMemoryCredentialVault();
    await vault.store("cred_1", "secret");
    expect(await vault.retrieve("cred_1")).toBe("secret");
    await vault.revoke("cred_1");
    expect(await vault.retrieve("cred_1")).toBeNull();
  });

  it("mock search ranks better term matches higher", async () => {
    const corpus = new Map([
      ["a", "the march newsletter deadline is march 21"],
      ["b", "unrelated document about beverages"],
    ]);
    const results = await mockSearchProvider.search("march deadline", corpus);
    expect(results[0]?.id).toBe("a");
  });
});
