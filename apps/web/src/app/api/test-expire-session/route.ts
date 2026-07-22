import { deleteSessionByToken } from "@continuum/db";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { testLoginEnabled } from "@/lib/env";

/**
 * Test-only: delete the current session ROW while leaving the browser cookie in
 * place — reproducing a stale session (a signed cookie whose session row is gone
 * after a dev restart wiped the in-memory DB). Used by e2e to prove /home no
 * longer loops in that state. IMPOSSIBLE to enable in production: gated by the
 * same `testLoginEnabled` guard as /api/test-login (404s when disabled).
 */
export async function POST(request: Request): Promise<Response> {
  if (!testLoginEnabled) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const token = session?.session?.token;
  if (!token) {
    return Response.json({ error: "no_session" }, { status: 400 });
  }

  await deleteSessionByToken(db, token);
  return Response.json({ expired: true });
}
