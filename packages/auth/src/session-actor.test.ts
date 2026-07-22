import { describe, expect, it } from "vitest";
import { sessionActor } from "./session-actor.js";

describe("sessionActor", () => {
  it("bridges an authenticated user id to a user Actor", () => {
    const actor = sessionActor("usr_123", "web_app");
    expect(actor.kind).toBe("user");
    expect(actor.userId).toBe("usr_123");
    expect(actor.integration).toBe("web_app");
  });

  it("defaults the integration to web_app", () => {
    expect(sessionActor("usr_1").integration).toBe("web_app");
  });

  it("refuses to mint an Actor without an authenticated user id", () => {
    expect(() => sessionActor("")).toThrow();
  });
});
