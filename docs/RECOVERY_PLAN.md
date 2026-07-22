# Recovery Plan

Turn the Phase-0 demo scaffold (see `RECOVERY_AUDIT.md`) into a real, polished, tested MVP without
producing another fake-screen prototype. Executed phase by phase, keeping the app runnable, committing
only verified phases, and never claiming a feature works without tests or direct evidence.

## Confirmed decisions

1. **DB driver strategy.** Embedded **PGlite** (`drizzle-orm/pglite`, real Postgres + pgvector, no
   Docker) for dev/test/sandbox; **`node-postgres`** against `DATABASE_URL` for production. One
   Drizzle store implementation, driver selected by env. **One schema, one migration history.**
2. **Auth: Better Auth** + official Drizzle adapter, DB-backed sessions, Google social login,
   email+password, password-reset + email-verification architecture, secure HttpOnly cookies,
   session expiration + revocation, protected routes, and a **local test-login that is impossible to
   enable in production**. Better Auth owns identity + sessions only; the existing Actor +
   `packages/auth` authorization layer still decides all org/Space/Project/memory/source/connector
   access. See `AUTHENTICATION_PLAN.md`.
3. **Google login ≠ Google connector auth (strict separation).** Login never grants Workspace
   access. Connector authorization is a separate consent step with separate minimum scopes, separate
   token storage, and separate revocation. A login token is never reused as a connector token.
4. **Production DB gate.** Before release, run migrations + store/authorization/cross-Space-isolation
   tests against a hosted Postgres + pgvector instance.
5. **Connectors.** Google Workspace real only this pass; Slack/Notion/GitHub stay honest
   "Coming soon"/"Setup required" placeholders (no fake integrations). See
   `CONNECTOR_IMPLEMENTATION_STATUS.md`.
6. **Connector credential storage.** AES-256-GCM authenticated encryption with a versioned
   server-side key stored outside the DB, supporting rotation. Never log credentials, tokens, or keys.
7. **Delivery.** Incremental commits to `claude/continuum-mvp-recovery-yed1rm`, per-phase report,
   one PR at the end.

## Architecture changes

- **`packages/db`**: env-driven `createDatabase()` (PGlite dev/test, node-postgres prod);
  `createTestDatabase()` helper (fresh PGlite + migrations + pgvector) reused by integration tests;
  real generated migrations.
- **Drizzle-backed stores** implementing existing interfaces, in their owning packages (AGENTS.md
  ownership): `packages/memory/src/drizzle-store.ts`, `packages/auth/src/drizzle-store.ts`,
  `packages/connectors-core/src/drizzle-installation-store.ts`, plus context/generation +
  audit/activity persistence. In-memory factories remain for unit tests + Demo Mode. Services stay
  store-agnostic.
- **`apps/web` services wiring**: request-scoped factory that resolves the Better Auth session →
  Continuum `Actor`, builds services over Drizzle stores, and keeps a separate clearly-badged
  **Demo Mode** (in-memory, namespaced demo org/user).
- **Better Auth** server + Drizzle adapter + `middleware.ts` (protected routes + return-to) +
  session→Actor resolver in `packages/auth`. Test-login fails closed in production.
- **Credential vault (real)**: AES-256-GCM, versioned key from `CONTINUUM_CREDENTIAL_KEYS`
  (outside DB), rotation; ciphertext + key version bound to `connector_installations.credential_ref`.
- **Google Workspace connector** (`packages/connectors/src/google/*`): real Drive/Gmail/Calendar
  adapters with their own OAuth flow in the Gateway; credential-gated; mocks retained for Demo Mode.
- **App shell + DB-backed dashboard + onboarding** built from reusable token-based components.

## Phases and exit gates

| Phase | Scope                                                                                                                               | Exit gate                                                                                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Audit + these six plan docs                                                                                                         | Docs committed                                                                                                                                                               |
| 1     | Install, `pnpm check` green, PGlite driver + `createTestDatabase()`, real migrations, env validation, error boundaries              | `pnpm check` green; app runs; migrations apply on PGlite                                                                                                                     |
| 2     | Better Auth (Google + email/password + test-login-fails-closed), sessions, protected routes, session→Actor                          | Real user record (no dupes); session persists; protected routes reject anon; logout+revocation; test-login impossible in prod; login grants no Workspace access — all tested |
| 3     | Onboarding with persisted progress → first real Context Receipt                                                                     | New user reaches a real Context Receipt from persisted data                                                                                                                  |
| 4     | DB-backed dashboard + app shell + Space/Project switcher                                                                            | Every section reflects real data or a truthful empty state; fast switching                                                                                                   |
| 5     | Connector foundation: Drizzle installs, AES-256-GCM vault + rotation, OAuth orchestration, health, import pipeline, connectors page | Revocation destroys creds; rotation works; import persists; no secret in logs — all tested                                                                                   |
| 6     | Google Workspace real adapters (own OAuth), credential-gated                                                                        | Connect→select→import→approve→retrieve→receipt; disconnect revokes (live vs Google credential-gated)                                                                         |
| 7     | Slack/Notion/GitHub honest placeholders (no fake integrations)                                                                      | Directory shows honest states; sample data Demo-Mode-only                                                                                                                    |
| 8     | UI refinement, motion, dark/light, accessibility                                                                                    | Reduced-motion + mobile excellent; axe pass; keyboard sweep                                                                                                                  |
| 9     | Playwright suite + screenshots, isolation e2e, perf/security, **hosted-Postgres compatibility gate**                                | Full suite green; contamination zero; prod build passes; PR opened                                                                                                           |

## Testing strategy

- **Unit** (Vitest): authz, connector state transitions, token refresh, normalization, memory
  approval, context retrieval, onboarding state, dashboard queries.
- **Integration** against `createTestDatabase()` (PGlite + migrations): auth, protected routes,
  user/Space/Project creation, connector install, source import, memory approval, receipt creation,
  disconnect, and **cross-Space isolation (release-blocking, zero contamination)**.
- **E2E** (Playwright): auth, onboarding, dashboard, connector (dev/mock path), cross-Space
  isolation, visual screenshots. Test-login gives deterministic sign-in without Google creds.
- **Gate after each phase**: `pnpm check` (format, lint, typecheck, tests, build) — no skips, no
  `any`, no suppressed errors, clean browser console.

## Risks & rollback

- No Docker Postgres here → PGlite dev/test, `DATABASE_URL` prod, hosted-Postgres gate pre-release.
- Better Auth adapter vs bespoke `sessions` schema → explicit migrations + custom-table mapping;
  migrate cleanly, remove unused custom session fields.
- Real Google flow unverifiable without user creds → build + unit-test with mocked HTTP; gate behind
  creds; report verification steps in the credential handoff.
- Large scope → land vertically; keep app runnable each phase. Demo Mode (in-memory) is an
  always-runnable fallback so broken DB/auth wiring never bricks the app.

## Credential handoff (required from the user for live third-party features)

- **Better Auth (login)**: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and a login Google OAuth client
  `GOOGLE_LOGIN_CLIENT_ID`/`GOOGLE_LOGIN_CLIENT_SECRET` (scopes `openid email profile` only) +
  callback URL. Email/password + test-login need no external creds.
- **Google Workspace connector (separate app)**: distinct `GOOGLE_CONNECTOR_CLIENT_ID`/
  `GOOGLE_CONNECTOR_CLIENT_SECRET` with Drive/Gmail/Calendar readonly scopes + connector redirect URI
  - a Google test account.
- **Credential encryption**: `CONTINUUM_CREDENTIAL_KEYS` (versioned AES-256-GCM key material).
- **Production database**: `DATABASE_URL` for hosted Postgres + pgvector (e.g. Neon).
- **Later connectors**: Slack/Notion/GitHub OAuth credentials when those move from placeholder to real.
