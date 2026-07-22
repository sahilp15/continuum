import { createTestDatabase, schema, type DatabaseHandle } from "@continuum/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuth, type Auth } from "./auth-factory";

/**
 * Integration tests for the authentication core against a real (PGlite) database
 * with migrations applied. Proves user creation (no duplicates), session
 * persistence, and revocation — the auth guarantees the app depends on.
 */
describe("auth core (Better Auth + Drizzle on PGlite)", () => {
  let handle: DatabaseHandle;
  let auth: Auth;

  beforeEach(async () => {
    handle = await createTestDatabase();
    auth = createAuth({
      database: handle.db,
      secret: "test-only-secret-abcdefghijklmnop",
      baseURL: "http://localhost:3000",
    });
  });

  afterEach(async () => {
    await handle.close();
  });

  it("sign-up creates exactly one user, defaulting onboardingStatus to not_started", async () => {
    const res = await auth.api.signUpEmail({
      body: { email: "new@continuum.test", name: "New User", password: "password123" },
    });
    expect(res.user.email).toBe("new@continuum.test");

    const rows = await handle.db.select().from(schema.users);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.onboardingStatus).toBe("not_started");
    expect(rows[0]?.email).toBe("new@continuum.test");
  });

  it("does not create a duplicate user for the same email", async () => {
    await auth.api.signUpEmail({
      body: { email: "dup@continuum.test", name: "Dup", password: "password123" },
    });
    await expect(
      auth.api.signUpEmail({
        body: { email: "dup@continuum.test", name: "Dup Again", password: "password123" },
      }),
    ).rejects.toThrow();

    const rows = (await handle.db.select().from(schema.users)).filter(
      (u) => u.email === "dup@continuum.test",
    );
    expect(rows).toHaveLength(1);
  });

  it("sign-in persists a session, and sign-out revokes it", async () => {
    await auth.api.signUpEmail({
      body: { email: "s@continuum.test", name: "S", password: "password123" },
    });

    const signInResponse = await auth.api.signInEmail({
      body: { email: "s@continuum.test", password: "password123" },
      asResponse: true,
    });
    const setCookie = signInResponse.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();

    const sessionsBefore = await handle.db.select().from(schema.sessions);
    expect(sessionsBefore.length).toBeGreaterThanOrEqual(1);

    // Reuse the issued cookie to prove the session validates (persistence).
    const cookiePair = setCookie!.split(";")[0]!;
    const headers = new Headers({ cookie: cookiePair });
    const session = await auth.api.getSession({ headers });
    expect(session?.user.email).toBe("s@continuum.test");

    // Sign out revokes: the same cookie no longer resolves to a session.
    await auth.api.signOut({ headers });
    const afterSignOut = await auth.api.getSession({ headers });
    expect(afterSignOut).toBeNull();
  });

  it("rejects invalid credentials", async () => {
    await auth.api.signUpEmail({
      body: { email: "c@continuum.test", name: "C", password: "password123" },
    });
    await expect(
      auth.api.signInEmail({
        body: { email: "c@continuum.test", password: "wrong-password" },
      }),
    ).rejects.toThrow();
  });
});
