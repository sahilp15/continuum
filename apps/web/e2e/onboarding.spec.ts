import { expect, test } from "@playwright/test";

/**
 * Onboarding e2e: a brand-new user completes the guided flow and reaches a real
 * Context Receipt generated from their own persisted, approved memory — then
 * lands on the DB-backed dashboard.
 */
test("new user completes onboarding to a real Context Receipt", async ({ page }) => {
  const email = `onb-${Date.now()}@continuum.test`;

  // Sign up (email/password, no external creds) → routed into onboarding.
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Onboarding Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/(onboarding|home)/);
  await page.goto("/onboarding"); // deterministic entry into the flow

  // Step 0 — Welcome + persona
  await expect(page.getByRole("heading", { name: /welcome to continuum/i })).toBeVisible();
  await page.getByRole("button", { name: "Get started" }).click();

  // Step 1 — Profile
  await page.getByLabel("Name").fill("Onboarding Tester");
  await page.getByLabel("Role").fill("Freelance writer");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2 — First Space
  await expect(page.getByRole("heading", { name: /create your first space/i })).toBeVisible();
  await page.getByLabel("Space name").fill("Northbank");
  await page.getByRole("button", { name: "Create Space" }).click();

  // Step 3 — Connect a source (manual import path)
  await page.getByRole("button", { name: /paste or upload instead/i }).click();

  // Step 4 — Import
  await page.getByLabel("Title").fill("Brand guide");
  await page
    .getByLabel("Content")
    .fill(
      "Voice: precise, calm, professional.\nAudience: small-business CFOs.\nThe newsletter launches March 21.",
    );
  await page.getByRole("button", { name: "Extract candidates" }).click();

  // Step 5 — Review: approve the first candidate, then continue
  await expect(page.getByRole("heading", { name: /review suggested memory/i })).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 6 — First Project → generates first context
  await page.getByLabel("Project name").fill("March newsletter");
  await page.getByRole("button", { name: /generate first context/i }).click();

  // Step 7 — First result: a real Context Receipt
  await expect(page.getByRole("heading", { name: /your first context package/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Context Receipt" })).toBeVisible();
  await page.getByRole("button", { name: /go to your dashboard/i }).click();

  // Lands on the DB-backed dashboard, in the Space they created.
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByRole("heading", { name: /good to see you/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Northbank" })).toBeVisible();
});
