import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e. Uses the pre-installed Chromium (executablePath) so no
 * download is needed. The dev server runs with the local test-login enabled and
 * an isolated PGlite database.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM ?? "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: { executablePath: CHROMIUM },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: "development",
      CONTINUUM_TEST_LOGIN: "1",
      // In-memory: a single process-wide PGlite instance, no file lock to
      // contend on across module instances.
      CONTINUUM_PGLITE_DIR: "memory://",
      // e2e must be hermetic: whether "no credentials configured" tests pass
      // can never depend on a developer's local .env (see next.config.ts).
      CONTINUUM_SKIP_DOTENV: "1",
    },
  },
});
