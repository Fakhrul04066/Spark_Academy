import { test, expect } from "@playwright/test";
import "dotenv/config";
test("reference landing: class filters, course details, FAQ and real login", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /নতুন শক্তিতে/ }),
  ).toBeVisible();
  await expect(page.locator("#coursegrid article:visible")).toHaveCount(6);
  await page.locator('.grade[data-grade="6"]').click();
  await expect(page.locator("#coursegrid article:visible")).toHaveCount(1);
  await expect(page.locator("#coursegrid article:visible")).toContainText(
    "Class 6",
  );
  await page.locator('.pill[data-filter="hsc"]').click();
  await expect(page.locator("#coursegrid article:visible")).toHaveCount(2);
  await page.locator("#coursegrid article:visible button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const faq = page.locator(".faq-q").first();
  await faq.click();
  await expect(faq).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".faq-a").first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator("#navlinks")).toBeVisible();
    await page.locator("#navlinks a").first().click();
    await expect(page.locator("#navlinks")).not.toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/reference-${info.project.name}.png`,
    fullPage: true,
  });
  await page.locator('.nav-actions a[href="/login"]').click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "Sign in →", exact: true })
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe("rgb(22, 50, 79)");
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
    ).toBe("rgb(36, 68, 95)");
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
