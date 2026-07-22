import { auth } from "@/lib/auth";
import { testLoginEnabled } from "@/lib/env";

/**
 * Local test-login for Playwright — signs in a deterministic account without
 * Google. It is IMPOSSIBLE to enable in production: env.ts rejects the flag in
 * production, and `testLoginEnabled` requires NODE_ENV !== "production" AND
 * CONTINUUM_TEST_LOGIN=1. When disabled this route 404s (fails closed).
 */
const TEST_PASSWORD = "continuum-test-login-pw-123";

export async function POST(request: Request): Promise<Response> {
  if (!testLoginEnabled) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    name?: unknown;
  };
  const email = typeof body.email === "string" ? body.email : "playwright@continuum.test";
  const name = typeof body.name === "string" ? body.name : "Playwright Tester";

  // Idempotently ensure the account exists, then sign in and forward the
  // Set-Cookie header so the browser is authenticated.
  try {
    await auth.api.signUpEmail({ body: { email, name, password: TEST_PASSWORD } });
  } catch {
    // Account already exists from a previous run — expected, continue.
  }

  return auth.api.signInEmail({
    body: { email, password: TEST_PASSWORD },
    asResponse: true,
  });
}
