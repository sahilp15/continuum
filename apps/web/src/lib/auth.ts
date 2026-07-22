import "server-only";
import { nextCookies } from "better-auth/next-js";
import { createAuth } from "./auth-factory";
import { db } from "./db";
import { env, googleLoginEnabled } from "./env";

/**
 * The app's Better Auth singleton. Better Auth owns identity + session
 * authentication only; Continuum's Actor + authorization policies still decide
 * resource access (see AUTHENTICATION_PLAN.md). Sessions are database-backed;
 * cookies are HttpOnly and Secure in production; tokens never reach client JS.
 */
export const auth = createAuth({
  database: db,
  secret: env.BETTER_AUTH_SECRET ?? "continuum-dev-only-secret-change-in-production",
  // In production BETTER_AUTH_URL pins the canonical origin; in dev it's omitted
  // so Better Auth infers the origin from the request (ports vary across
  // dev/e2e servers), avoiding INVALID_ORIGIN.
  baseURL: env.BETTER_AUTH_URL,
  google: googleLoginEnabled
    ? {
        clientId: env.GOOGLE_LOGIN_CLIENT_ID!,
        clientSecret: env.GOOGLE_LOGIN_CLIENT_SECRET!,
      }
    : undefined,
  // nextCookies() must be last so it can set cookies on server-action responses.
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
