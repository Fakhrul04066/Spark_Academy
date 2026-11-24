import { test, expect } from "@playwright/test";
test.beforeEach(async ({page}) => {
  await page.route("https://fonts.googleapis.com/**", route => route.fulfill({contentType:"text/css",body:""}));
});
test("cards animate automatically without arrow or playback buttons", async ({ page }) => {
  await page.goto("/");
  const mobile=(page.viewportSize()?.width||1440)<=1120;
  const stack=page.locator(".storm-course-stack");
  await stack.scrollIntoViewIfNeeded();
  await page.mouse.move(0,0);
  await expect(page.locator(".orbit-arrow,.ring-control,.ring-instruction")).toHaveCount(0);
  if(mobile){
    await expect.poll(()=>stack.evaluate(el=>el.scrollLeft),{timeout:10000}).toBeGreaterThan(20);
  } else {
    const first=stack.locator(".storm-course-tile").first();
    const before=await first.getAttribute("style");
    await expect.poll(()=>first.getAttribute("style")).not.toBe(before);
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  const first=stack.locator(mobile?".is-mobile-current":".storm-course-tile").first();
  await expect(first).toBeVisible();
  await page.waitForTimeout(500);
  const before=mobile?await stack.evaluate(el=>el.scrollLeft):await first.getAttribute("style");
  await page.waitForTimeout(800);
  expect(mobile?await stack.evaluate(el=>el.scrollLeft):await first.getAttribute("style")).toBe(before);
});
