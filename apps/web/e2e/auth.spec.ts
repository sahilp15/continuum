import { expect, test } from "@playwright/test";

/**
 * Authentication e2e: sign-up, session persistence across reload, logout, and
 * protected-route enforcement — exercised through the real UI and Better Auth.
 */

test("unauthenticated user is redirected from a protected route to sign-in", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test("sign up, session persists across reload, and protected routes need a session", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@continuum.test`;

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/(onboarding|home)/); // signed in, inside the app

  // A brand-new user is gated into onboarding (deterministic on navigation).
  await page.goto("/home");
  await expect(page).toHaveURL(/\/onboarding/);

  // Session persists across a full reload (not bounced to sign-in).
  await page.reload();
  await expect(page).toHaveURL(/\/onboarding/);

  // Ending the session blocks protected routes.
  await page.context().clearCookies();
  await page.goto("/home");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
});

test("authenticated user is redirected away from the sign-in page", async ({ page }) => {
  const email = `e2e-redir-${Date.now()}@continuum.test`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Redir User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  // Signed-in users don't sit on the sign-in page. This bounce is now gated on
  // the real session in (auth)/layout.tsx, not a cookie-presence check.
  await page.goto("/sign-in");
  await expect(page).not.toHaveURL(/\/sign-in/);
});

test("a stale session cookie does not cause a /home redirect loop", async ({ page }) => {
  const email = `e2e-stale-${Date.now()}@continuum.test`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Stale User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/(onboarding|home)/);

  // Delete the session ROW but keep the browser cookie — the exact state a dev
  // restart leaves behind (signed cookie, no session). Before the fix this made
  // /home and /sign-in redirect back and forth forever.
  const res = await page.request.post("/api/test-expire-session");
  expect(res.ok()).toBeTruthy();

  // Opening /home must settle on the sign-in form after a SINGLE, self-healing
  // redirect through /api/session/reset — not spin in a loop.
  await page.goto("/home");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  await expect(page.getByLabel("Email")).toBeVisible();

  // The stale cookie was cleared, so a subsequent protected-route hit is a clean
  // single redirect too (no session cookie left to bounce on).
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
});
