import { schema, type ContinuumDatabase } from "@continuum/db";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * Pure Better Auth factory — no server-only / no DB singleton imports, so it is
 * safe to construct in tests against a throwaway database. See auth.ts for the
 * app singleton and AUTHENTICATION_PLAN.md for the design.
 */
export interface CreateAuthConfig {
  database: ContinuumDatabase;
  secret: string;
  /** Canonical URL (production). Omit in dev so Better Auth infers the origin
   *  from the request — dev/e2e servers run on varying ports. */
  baseURL?: string;
  /** Extra trusted origins for CSRF/origin checks (e.g. dev localhost ports). */
  trustedOrigins?: string[];
  google?: { clientId: string; clientSecret: string };
  plugins?: BetterAuthOptions["plugins"];
}

export function createAuth(cfg: CreateAuthConfig) {
  return betterAuth({
    appName: "Continuum",
    ...(cfg.baseURL ? { baseURL: cfg.baseURL } : {}),
    ...(cfg.trustedOrigins ? { trustedOrigins: cfg.trustedOrigins } : {}),
    secret: cfg.secret,
    database: drizzleAdapter(cfg.database, {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    socialProviders: cfg.google
      ? {
          google: {
            clientId: cfg.google.clientId,
            clientSecret: cfg.google.clientSecret,
            // Identity only — never Google Workspace data scopes.
            scope: ["openid", "email", "profile"],
          },
        }
      : undefined,
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh once per day of activity
    },
    user: {
      additionalFields: {
        onboardingStatus: { type: "string", required: false, input: false },
      },
    },
    plugins: cfg.plugins ?? [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
