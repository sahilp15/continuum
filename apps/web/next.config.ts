import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

/**
 * Next.js only auto-loads .env files from THIS app's own directory
 * (apps/web) — never the monorepo root, even though .env.example, the
 * README, and every doc in this repo document ONE .env at the repo root.
 * Load it explicitly so `next dev`/`next build`/`next start` see it.
 *
 * Skipped in true production: real deployments set env vars via the hosting
 * platform, never a local/committed file (same "dev config never in
 * production" posture as CONTINUUM_TEST_LOGIN). `next build` also runs with
 * NODE_ENV=production, but that's fine — build time doesn't need secrets
 * (see the NEXT_PHASE guard in lib/db.ts) and this only affects `next start`.
 *
 * Also skipped when CONTINUUM_SKIP_DOTENV=1 (set by playwright.config.ts):
 * e2e must be hermetic — whether "no credentials configured" tests pass
 * can't depend on what a developer happens to have in their local .env.
 */
if (process.env.NODE_ENV !== "production" && process.env.CONTINUUM_SKIP_DOTENV !== "1") {
  const here = dirname(fileURLToPath(import.meta.url));
  loadEnv({ path: resolve(here, "../../.env") });
}

const nextConfig: NextConfig = {
  // The dev-tools indicator defaults to bottom-left, where it overlaps the
  // sidebar's user menu; move it out of the way (dev-only, no prod effect).
  devIndicators: { position: "bottom-right" },
  // Domain packages ship as TypeScript-built ESM; transpile keeps dev smooth.
  transpilePackages: [
    "@continuum/auth",
    "@continuum/context",
    "@continuum/contracts",
    "@continuum/db",
    "@continuum/evals",
    "@continuum/memory",
    "@continuum/preflight",
    "@continuum/testing",
    "@continuum/ui",
  ],
  // PGlite loads WASM + a pgvector extension tarball via URLs; if webpack
  // bundles it, those asset URLs break at runtime. Keep it (and better-auth,
  // which reads the filesystem) as real Node modules resolved at runtime.
  // @continuum/db is transpiled (above) so its PGlite import is externalized here.
  serverExternalPackages: ["@electric-sql/pglite", "better-auth"],
};

export default nextConfig;
