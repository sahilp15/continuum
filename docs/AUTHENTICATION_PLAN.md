# Authentication Plan

Authentication uses **Better Auth** with the official **Drizzle adapter** and **database-backed
sessions**. Better Auth owns identity and session authentication only. Continuum's existing **Actor**
and `packages/auth` authorization policies still decide access to organizations, Spaces, Projects,
memories, sources, and connectors — Better Auth never bypasses or weakens those checks.

## Requirements (from the approved plan)

1. Better Auth + Drizzle adapter, DB-backed sessions.
2. Adapt to the existing `users` / `accounts` / `sessions` schema via explicit migrations.
3. Preserve the Actor + authorization-policy layer. Auth owns identity/sessions; Continuum authz
   owns resource access.
4. Secure, HttpOnly, SameSite cookies in production.
5. Google social login first.
6. Built-in email + password.
7. Password-reset + email-verification architecture.
8. A local **test-login** mechanism that is **impossible to enable in production** (fails closed).
9. Never expose OAuth access tokens or session tokens to client-side JS.
10. Session persistence, expiration, revocation, logout, protected routes, callback errors, and
    return-to-original-page redirects.
11. Do not let auth replace or weaken org/Space authorization.
12. Remove obsolete/unused custom session paths; migrate cleanly.
13. Google **login** and Google **Workspace connector** authorization are completely separate
    (separate consent, scopes, token storage, revocation). Never reuse a login token as a connector
    token. Login scopes are `openid email profile` only.

## Schema changes (one schema, one migration history)

Extend `packages/db/src/schema/identity.ts` to satisfy the Better Auth Drizzle adapter while keeping
Continuum's prefixed-string IDs and soft-delete:

- **users**: add `emailVerified` (boolean/timestamp per adapter), `image` (avatar), `onboardingStatus`
  (enum: `not_started` | `in_progress` | `complete`), `updatedAt`, `lastActiveAt`. Keep `email`,
  `name`, `createdAt`, `deletedAt`.
- **accounts**: add the adapter's provider columns — `accountId`, `providerId`, `accessToken`,
  `refreshToken`, `accessTokenExpiresAt`, `idToken`, `scope`, `password` (for email/password) — mapped
  onto the existing table. These hold **login-provider** tokens only; connector tokens live in the
  encrypted vault, never here.
- **sessions**: migrate to the Better Auth session shape — `token` (unique), `expiresAt`, `ipAddress`,
  `userAgent`, `userId`, `createdAt`, `updatedAt`. Remove the unused bespoke `tokenHash`/`revokedAt`
  columns that Better Auth does not use (revocation is deletion/expiry of the session row).
- **verification**: new table (`identifier`, `value`, `expiresAt`) for email-verification + password
  reset.

All changes ship as explicit generated migrations; PGlite (dev/test) and hosted Postgres (prod)
share the same migration history.

## Session → Actor bridge (authorization preserved)

A resolver in `packages/auth` (`session-actor.ts`) maps an authenticated Better Auth session's
`userId` to a Continuum `Actor` (`userActor(userId, "web_app")`). Every server component / action /
route obtains the Actor through this resolver and passes it to domain services, which enforce
`assertSpaceAccess` and the policy layer exactly as today. There is no path where a valid session
skips authorization. The hardcoded `getDemoActor()` is removed from production code paths (Demo Mode
keeps its own clearly-badged actor).

## Test-login (fails closed in production)

A credentials-style test-login is enabled only when **both** `NODE_ENV !== "production"` **and** an
explicit `CONTINUUM_TEST_LOGIN=1` flag are set. If either is missing it is not registered; if somehow
configured in production it throws at startup (fail closed). It exists purely so Playwright can sign
in deterministically without Google credentials. It is never a route in a production build.

## Cookies & token exposure

Sessions are DB-backed; the cookie carries only an opaque session token, `HttpOnly`, `SameSite=Lax`
(strict where compatible), `Secure` in production. OAuth access/refresh tokens are never sent to the
browser. Server-only modules read tokens; client components receive only non-sensitive profile fields.

## Routes & redirects

- `middleware.ts` protects the `(app)` route group and onboarding; unauthenticated users are
  redirected to sign-in with a `returnTo` param and sent back after login.
- Authenticated users hitting sign-in/sign-up are redirected to the app.
- Invalid/expired OAuth callbacks render a real error state (what happened, whether data is safe,
  what to do). Duplicate-account handling: an email already linked routes to sign-in rather than
  creating a second user.

## Environment variables

| Var                                                     | Purpose                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`                                    | session signing/encryption secret (required)                 |
| `BETTER_AUTH_URL`                                       | canonical app URL (prod)                                     |
| `GOOGLE_LOGIN_CLIENT_ID` / `GOOGLE_LOGIN_CLIENT_SECRET` | Google **login** OAuth client, scopes `openid email profile` |
| `CONTINUUM_TEST_LOGIN`                                  | dev/test only; enables test-login (fails closed in prod)     |

Google login callback URL: `${BETTER_AUTH_URL}/api/auth/callback/google`. Email/password and
test-login require no external credentials.

## Tests

- **Integration** (PGlite): sign-in creates exactly one user record (no dupes on repeat sign-in);
  session persists; protected route rejects anon; expired session rejected; revoked/logged-out
  session rejected; unauthorized Space access returns `not_found`; test-login refuses to register in
  a production env.
- **Playwright**: sign-in (test-login) → redirect → refresh persists session → logout → protected
  route blocked; login-with-Google grants no Workspace connector access.
