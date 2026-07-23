import { expect, test } from "@playwright/test";

/**
 * Connectors page honesty: with NO connector credentials configured (the e2e
 * server sets none), everything must read "Setup required"/"Coming soon" —
 * never "Connected" — and the OAuth start route must refuse with an honest
 * error instead of pretending.
 */

async function signUpAndOnboard(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Conn Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/(onboarding|home)/);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Name").fill("Conn Tester");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Space name").fill("Northbank");
  await page.getByRole("button", { name: "Create Space" }).click();
  await page.getByRole("button", { name: /paste or upload instead/i }).click();
  await page.getByLabel("Content").fill("The launch is March 21.");
  await page.getByRole("button", { name: "Extract candidates" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Project name").fill("Launch");
  await page.getByRole("button", { name: /generate first context/i }).click();
  await page.getByRole("button", { name: /go to your dashboard/i }).click();
  await expect(page).toHaveURL(/\/home/);
}

test("without credentials, connectors show honest setup states and never 'Connected'", async ({
  page,
}) => {
  await signUpAndOnboard(page, `conn-${Date.now()}@continuum.test`);

  await page.goto("/connectors");
  await expect(page.getByRole("heading", { name: "Connectors" })).toBeVisible();

  // Vault + Google honestly report setup required; placeholders say coming soon.
  await expect(page.getByText("Setup required").first()).toBeVisible();
  await expect(page.getByText("Coming soon").first()).toBeVisible();
  await expect(page.getByText("No connections yet.")).toBeVisible();
  // The word "Connected" must not appear anywhere without a real verified flow.
  await expect(page.locator("main, body").getByText("Connected", { exact: true })).toHaveCount(0);

  // The OAuth start route fails closed with an honest error.
  await page.goto("/api/connectors/google/connect");
  await expect(page).toHaveURL(/\/connectors\?error=not_configured/);
  await expect(page.getByRole("status")).toContainText(/not configured/i);
});
