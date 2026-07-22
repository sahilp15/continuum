import type { NextConfig } from "next";

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
