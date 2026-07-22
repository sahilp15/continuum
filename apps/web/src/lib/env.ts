import "server-only";
import { z } from "zod";

/**
 * Server-only environment validation for the web app. Fail-fast with readable
 * errors. Grows as features land (connector keys in Phase 5). Never import this
 * from client components — it reads secrets.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Better Auth (login/identity). AUTH secret is required in production; in
    // dev/test a stable fallback keeps the app runnable with zero setup.
    BETTER_AUTH_SECRET: z.string().min(1).optional(),
    BETTER_AUTH_URL: z.string().url().optional(),

    // Google *login* provider (identity only, scopes openid/email/profile).
    // Distinct from the Google *connector* app (Workspace data) — never shared.
    GOOGLE_LOGIN_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_LOGIN_CLIENT_SECRET: z.string().min(1).optional(),

    // Local test-login for Playwright. MUST be impossible to enable in prod.
    CONTINUUM_TEST_LOGIN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Next runs `next build` with NODE_ENV=production, but runtime secrets aren't
    // (and shouldn't be) present at build time — only when actually serving. So
    // enforce runtime-secret requirements only outside the build phase.
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
    if (env.NODE_ENV === "production" && !isBuildPhase) {
      if (!env.BETTER_AUTH_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["BETTER_AUTH_SECRET"],
          message: "BETTER_AUTH_SECRET is required in production.",
        });
      }
      // Fail closed: the test-login must never be configurable in production.
      if (env.CONTINUUM_TEST_LOGIN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CONTINUUM_TEST_LOGIN"],
          message:
            "CONTINUUM_TEST_LOGIN must not be set in production. The local test-login is dev/test only.",
        });
      }
    }
    if (env.GOOGLE_LOGIN_CLIENT_ID && !env.GOOGLE_LOGIN_CLIENT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_LOGIN_CLIENT_SECRET"],
        message: "GOOGLE_LOGIN_CLIENT_SECRET is required when GOOGLE_LOGIN_CLIENT_ID is set.",
      });
    }
  });

function parse() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid web app environment:\n${details}`);
  }
  return result.data;
}

export const env = parse();

/** Google login is available only when its login-specific credentials are set. */
export const googleLoginEnabled = Boolean(
  env.GOOGLE_LOGIN_CLIENT_ID && env.GOOGLE_LOGIN_CLIENT_SECRET,
);

/**
 * The local test-login is enabled only when BOTH conditions hold — it is
 * impossible in production (the env parser above rejects the flag there, and
 * this guard also excludes it), so it fails closed.
 */
export const testLoginEnabled = env.NODE_ENV !== "production" && env.CONTINUUM_TEST_LOGIN === "1";
