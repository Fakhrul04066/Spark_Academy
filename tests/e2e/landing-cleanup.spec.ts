import { test, expect } from "@playwright/test";
test.beforeEach(async ({page}) => {
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({contentType:"text/css",body:""}));
});
test("landing removes marked copy, decorative arrows and playback buttons", async ({ page }) => {
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".storm-intro,.storm-brand-prefix,.storm-headline,.storm-feature-arrow,.ring-control")).toHaveCount(0);
  await expect(page.locator(".nav-actions .spark-enroll")).toHaveText("Enroll Now");
  await expect(page.locator(".cta h2")).toHaveText("আজই শুরু হোক নতুন যাত্রা!");
  await expect(page.locator(".spark-landing")).not.toContainText("↗");
  await expect(page.locator(".spark-login-button")).toHaveCSS("animation-name","none");
  await expect(page.locator(".spark-login-button")).toHaveCSS("transition-duration","0s");
  await page.locator(".storm-feature-stack").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".ring-control,.orbit-arrow,.ring-instruction")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
