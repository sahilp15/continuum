import { test } from "@playwright/test";

/** UI audit capture: every route in desktop light/dark + mobile light. */
const OUT = process.env.SHOT_DIR ?? "/tmp/ui-audit";
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function onboard(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Rohit");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/(onboarding|home)/);
  await page.goto("/onboarding");
  await page.screenshot({ path: `${OUT}/onboarding-step1-welcome.png`, fullPage: true });
  await page.getByRole("button", { name: "Get started" }).click();
  await page.screenshot({ path: `${OUT}/onboarding-step2-profile.png`, fullPage: true });
  await page.getByLabel("Name").fill("Rohit");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.screenshot({ path: `${OUT}/onboarding-step3-space.png`, fullPage: true });
  await page.getByLabel("Space name").fill("Northbank");
  await page.getByRole("button", { name: "Create Space" }).click();
  await page.screenshot({ path: `${OUT}/onboarding-step4-connect.png`, fullPage: true });
  await page.getByRole("button", { name: /paste or upload instead/i }).click();
  await page.screenshot({ path: `${OUT}/onboarding-step5-import.png`, fullPage: true });
  await page
    .getByLabel("Content")
    .fill("Voice: warm, direct.\nAudience: indie founders.\nThe launch is March 21.");
  await page.getByRole("button", { name: "Extract candidates" }).click();
  await page.screenshot({ path: `${OUT}/onboarding-step6-review.png`, fullPage: true });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Project name").fill("March launch");
  await page.screenshot({ path: `${OUT}/onboarding-step7-project.png`, fullPage: true });
  await page.getByRole("button", { name: /generate first context/i }).click();
  await page.screenshot({ path: `${OUT}/onboarding-step8-receipt.png`, fullPage: true });
  await page.getByRole("button", { name: /go to your dashboard/i }).click();
  await page.waitForURL(/\/home/);
}

const ROUTES: Array<[string, string]> = [
  ["/", "landing"],
  ["/sign-in", "sign-in"],
  ["/home", "home"],
  ["/spaces", "spaces"],
  ["/projects", "projects"],
  ["/inbox", "inbox"],
  ["/check", "preflight"],
  ["/receipts", "receipts"],
  ["/connectors", "connectors"],
  ["/settings", "settings"],
];

test("capture all routes for the UI audit", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize(DESKTOP);
  await onboard(page, `audit-${Date.now()}@continuum.test`);

  for (const [route, name] of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.emulateMedia({ colorScheme: "light" });
    await page.screenshot({ path: `${OUT}/desktop-light-${name}.png`, fullPage: true });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.screenshot({ path: `${OUT}/desktop-dark-${name}.png`, fullPage: true });
  }

  await page.setViewportSize(MOBILE);
  await page.emulateMedia({ colorScheme: "light" });
  for (const [route, name] of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${OUT}/mobile-light-${name}.png`, fullPage: true });
  }

  // Sign-up page unauthenticated (fresh context state via sign-out not needed —
  // capture with cleared cookies).
  await page.context().clearCookies();
  await page.setViewportSize(DESKTOP);
  await page.goto("/sign-up");
  await page.emulateMedia({ colorScheme: "light" });
  await page.screenshot({ path: `${OUT}/desktop-light-sign-up.png`, fullPage: true });
});
