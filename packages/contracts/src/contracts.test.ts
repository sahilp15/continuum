import { describe, expect, it } from "vitest";
import {
  connectorManifestSchema,
  contextRequestSchema,
  memorySchema,
  newId,
  precedenceRank,
  sensitivityRank,
} from "./index.js";

describe("ids", () => {
  it("generates prefixed ids", () => {
    const id = newId("mem");
    expect(id).toMatch(/^mem_[a-z0-9]{20}$/);
  });
});

describe("precedence", () => {
  it("ranks compliance rules above personal preferences", () => {
    expect(precedenceRank("space_compliance_rule")).toBeLessThan(
      precedenceRank("personal_preference"),
    );
  });

  it("ranks project facts above space facts", () => {
    expect(precedenceRank("project_fact")).toBeLessThan(precedenceRank("space_approved_fact"));
  });
});

describe("sensitivity", () => {
  it("orders sensitivity levels", () => {
    expect(sensitivityRank("public")).toBeLessThan(sensitivityRank("restricted"));
  });
});

describe("memory schema", () => {
  it("rejects a memory without a space", () => {
    const result = memorySchema.safeParse({
      id: newId("mem"),
      organizationId: newId("org"),
      type: "fact",
      title: "t",
      canonicalText: "text",
      status: "approved",
      createdBy: newId("usr"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});

describe("context request", () => {
  it("applies safe defaults", () => {
    const parsed = contextRequestSchema.parse({
      organizationId: newId("org"),
      spaceId: newId("spc"),
      requestingIntegration: "mcp",
    });
    expect(parsed.tokenBudget).toBe(4000);
    expect(parsed.sensitivityAllowance).toBe("confidential");
  });
});

describe("connector manifest", () => {
  it("rejects uppercase connector ids", () => {
    const result = connectorManifestSchema.safeParse({
      id: "BadId",
      displayName: "Bad",
      category: "email",
      version: "1.0.0",
      auth: "mock",
      capabilities: ["search"],
      entityTypes: ["email"],
      dataModes: ["live_only"],
      status: "mock",
    });
    expect(result.success).toBe(false);
  });
});
