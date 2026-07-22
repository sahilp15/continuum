import { defineConfig } from "vitest/config";

/**
 * Server-side unit/integration tests (node env). Playwright e2e lives under
 * e2e/ and is run separately via `pnpm test:e2e`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    // Better Auth + PGlite init can take a moment on first run.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
