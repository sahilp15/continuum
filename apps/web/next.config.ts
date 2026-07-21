import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Domain packages ship as TypeScript-built ESM; transpile keeps dev smooth.
  transpilePackages: [
    "@continuum/auth",
    "@continuum/context",
    "@continuum/contracts",
    "@continuum/evals",
    "@continuum/memory",
    "@continuum/preflight",
    "@continuum/testing",
    "@continuum/ui",
  ],
};

export default nextConfig;
