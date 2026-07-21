import { describe, expect, it } from "vitest";
import { createLogger, redact } from "./logger.js";

describe("redact", () => {
  it("redacts secret-like keys at any depth", () => {
    const out = redact({
      apiKey: "sk-123",
      nested: { refresh_token: "abc", ok: 1 },
      authorization: "Bearer xyz",
    }) as Record<string, unknown>;
    expect(out.apiKey).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).refresh_token).toBe("[redacted]");
    expect(out.authorization).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).ok).toBe(1);
  });
});

describe("logger", () => {
  it("emits structured JSON and never leaks secrets", () => {
    const lines: string[] = [];
    const log = createLogger({ name: "test", sink: (l) => lines.push(l) });
    log.info("connector installed", { connectorId: "gmail", accessToken: "tok_secret" });
    expect(lines).toHaveLength(1);
    const first = lines[0];
    expect(first).toBeDefined();
    const entry = JSON.parse(first as string) as Record<string, unknown>;
    expect(entry.message).toBe("connector installed");
    expect(entry.accessToken).toBe("[redacted]");
    expect(first).not.toContain("tok_secret");
  });

  it("respects level filtering and child bindings", () => {
    const lines: string[] = [];
    const log = createLogger({ name: "test", level: "warn", sink: (l) => lines.push(l) });
    log.info("hidden");
    log.child({ requestId: "req_1" }).error("boom");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("req_1");
  });
});
