import { test, expect } from "@playwright/test";
import "dotenv/config";
test("supplied landing: readable FAQ, slow circular controls, courses and mobile layout", async ({page}) => {
  await page.route("https://fonts.googleapis.com/**",r=>r.fulfill({contentType:"text/css",body:""}));
  await page.goto("/",{waitUntil:"commit"});
  await expect(page.locator(".storm-brand-title")).toContainText("SPARK");
  await expect(page.locator("#coursegrid article:visible")).toHaveCount(4);
  await expect(page.locator("#features .feature-3d-icon")).toHaveCount(6);
  await expect(page.locator("#coursegrid")).not.toContainText("ব্যাচের তথ্য অ্যাডমিনের কাছে");
  const mobile=(page.viewportSize()?.width||1440)<=1120;
  await expect(page.locator(".storm-course-stack")).toHaveAttribute(mobile?"data-carousel-mode":"data-orbit-speed",mobile?"swipe":"0.12");
  await page.locator('[data-filter="hsc"]').click();
  await expect(page.locator("#coursegrid article:visible")).toHaveCount(2);
  await page.locator("#coursegrid article:visible [data-course]").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button",{name:"QnA কি সরাসরি কল?",exact:true})).toHaveCount(1);
  await page.locator("#faq .faq-q").first().click();
  await expect(page.locator("#faq .faq-q").first()).toHaveAttribute("aria-expanded","true");
  await expect(page.locator("#faq .faq-a").first()).toBeVisible();
  const ratios=await page.locator("#faq").evaluate(root=>{
    const lum=(color:string)=>{const v=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
    return [".faq-q",".faq-a"].map(selector=>{const style=getComputedStyle(root.querySelector(selector)!);const a=lum(style.color),b=lum(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
  });
  for(const ratio of ratios)expect(ratio).toBeGreaterThanOrEqual(4.5);
  const pause=page.getByRole("button",{name:"Pause or play courses"});
  await pause.click();await expect(pause).toContainText("Play");
  const current=page.locator(mobile?".storm-course-stack .is-mobile-current":".storm-course-stack .is-orbit-current");
  const before=await current.getAttribute("data-go-grade");
  await page.getByRole("button",{name:"Next courses",exact:true}).click();
  await expect(current).not.toHaveAttribute("data-go-grade",before!);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(page.locator('.nav-actions a[href="/login"]')).toBeVisible();
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(pause).toBeDisabled();
});
for (const role of ["student", "teacher", "admin"] as const)
  test(`${role}: reference theme preserves functional dashboard`, async ({
    page,
  }, info) => {
    await page.goto("/login");
    await page
      .getByLabel("Email address")
      .fill(
        role === "admin" ? "admin@spark.example" : `${role}1@spark.example`,
      );
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.DEMO_SEED_PASSWORD!);
    await page.getByRole("button", { name: "Sign in →", exact: true }).click();
    await expect(page).toHaveURL(new RegExp("/" + role + "$"), {
      timeout: 60000,
    });
    await expect(
      page.getByRole("heading", { name: "Latest results", exact: true }),
    ).toBeVisible({ timeout: 60000 });
    expect(
      await page
        .locator(".sidebar nav a.active")
        .evaluate((e) => getComputedStyle(e).backgroundColor),
    ).toBe("rgb(32, 61, 43)");
    expect((await page.request.get("/api/profile")).status()).toBe(200);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    if (info.project.name === "mobile") {
      await page.getByRole("button", { name: "Toggle navigation" }).click();
      await expect(page.locator(".sidebar")).toBeVisible();
      await page.getByRole("button", { name: "Close navigation" }).click();
      await expect(page.locator(".sidebar")).not.toBeVisible();
    }
    await page.screenshot({
      path: `test-results/reference-${role}-${info.project.name}.png`,
      fullPage: true,
    });
  });
