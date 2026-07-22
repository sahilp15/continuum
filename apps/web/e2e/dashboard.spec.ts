import { expect, test } from "@playwright/test";

/**
 * Dashboard e2e: after onboarding, the dashboard loads real persisted data, the
 * Space switcher works, suggestions can be approved from the inbox, and a
 * Context Receipt can be generated.
 */

async function completeOnboarding(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Dash Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/(onboarding|home)/);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Name").fill("Dash Tester");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Space name").fill("Northbank");
  await page.getByRole("button", { name: "Create Space" }).click();
  await page.getByRole("button", { name: /paste or upload instead/i }).click();
  await page.getByLabel("Content").fill("The newsletter launches March 21. The deadline is firm.");
  await page.getByRole("button", { name: "Extract candidates" }).click();
  await page.getByRole("button", { name: "Continue" }).click(); // review (approve optional)
  await page.getByLabel("Project name").fill("March newsletter");
  await page.getByRole("button", { name: /generate first context/i }).click();
  await page.getByRole("button", { name: /go to your dashboard/i }).click();
  await expect(page).toHaveURL(/\/home/);
}

test("dashboard loads real data; a second Space can be created and switched", async ({ page }) => {
  const email = `dash-${Date.now()}@continuum.test`;
  await completeOnboarding(page, email);

  // Real dashboard content from the DB.
  await expect(page.getByRole("heading", { name: /good to see you/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your Spaces" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Northbank" })).toBeVisible();

  // Create a second Space and confirm the switcher shows both.
  await page.goto("/spaces");
  await page.getByPlaceholder("e.g. FizzPop").fill("FizzPop");
  await page.getByRole("button", { name: "Create Space" }).click();
  await expect(page).toHaveURL(/\/spaces\//);

  await page.goto("/home");
  const switcher = page.getByLabel("Active Space");
  await expect(switcher).toBeVisible();
  await expect(switcher.locator("option")).toHaveCount(2);
});

test("import a source and approve a suggestion from the inbox", async ({ page }) => {
  const email = `inbox-${Date.now()}@continuum.test`;
  await completeOnboarding(page, email);

  await page.goto("/inbox");
  await page.getByPlaceholder(/Title/).fill("Notes");
  await page
    .getByPlaceholder(/Paste text/)
    .fill("Voice: warm and playful.\nAudience: gen-z snack lovers.");
  await page.getByRole("button", { name: "Extract candidates" }).click();

  // At least one candidate appears; approve it.
  await expect(page.getByRole("button", { name: "Approve" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).first().click();
});
