import { test, expect } from "@playwright/test";
test.beforeEach(async ({page}) => {
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({contentType:"text/css",body:""}));
});
test("hero decoration stops work offscreen and restarts on return", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator(".storm-hero");
  await expect(hero).not.toHaveClass(/is-motion-paused/);
  await expect(page.locator(".storm-cloud").first()).toHaveCSS("animation-name", "none");
  await expect(page.locator(".storm-cloud").first()).toHaveCSS("filter", "none");
  await page.locator("#faq").scrollIntoViewIfNeeded();
  await expect(hero).toHaveClass(/is-motion-paused/);
  await expect(page.locator(".storm-energy-ring").first()).toHaveCSS("animation-play-state", "paused");
  await page.evaluate(() => scrollTo({top:0, behavior:"instant"}));
  await expect(hero).not.toHaveClass(/is-motion-paused/);
  await expect(page.locator(".storm-energy-ring").first()).toHaveCSS("animation-play-state", "running");
});
