import { test, expect, type Page } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import "dotenv/config";
async function signIn(
  page: Page,
  email: string,
  password: string,
  role: string,
) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/" + role + "$"), {
    timeout: 60000,
  });
}
test("administrator creates account; deactivate and reset invalidate its session", async ({
  page,
  browser,
}) => {
  await signIn(
    page,
    "admin@spark.example",
    process.env.DEMO_SEED_PASSWORD!,
    "admin",
  );
  const tag = randomUUID().slice(0, 8),
    email = `e2e-${tag}@spark.example`,
    password = `TestOnly-${randomUUID()}`;
  await page.goto("/admin/students");
  await page.getByRole("button", { name: "Add new", exact: true }).click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill(`E2E Learner ${tag}`);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page
    .getByLabel("Initial password (12+ characters)", { exact: true })
    .fill(password);
  await page.getByLabel("Student ID", { exact: true }).fill("E2E-" + tag);
  await page.getByLabel("Class", { exact: true }).fill("HSC");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("status")).toContainText("Saved successfully.");
  const data = await (await page.request.get("/api/students?q=" + tag)).json();
  const user = data.data.find((u: { email: string }) => u.email === email);
  expect(user).toBeTruthy();
  const context = await browser.newContext(),
    student = await context.newPage();
  await signIn(student, email, password, "student");
  expect((await student.request.get("/api/profile")).status()).toBe(200);
  const headers = { Origin: "http://127.0.0.1:3000" };
  expect(
    (
      await page.request.patch("/api/students", {
        headers,
        data: { id: user.id, active: false },
      })
    ).status(),
  ).toBe(200);
  expect((await student.request.get("/api/profile")).status()).toBe(401);
  expect(
    (
      await page.request.patch("/api/students", {
        headers,
        data: { id: user.id, active: true },
      })
    ).status(),
  ).toBe(200);
  await signIn(student, email, password, "student");
  const reset = await student.request.post("/api/password-reset", {
    headers,
    data: { email },
  });
  expect(reset.status()).toBe(200);
  expect(
    (
      await student.request.post("/api/password-reset", {
        headers,
        data: { email },
      })
    ).status(),
  ).toBe(200);
  const messages = await Promise.all(
    (await readdir(".local/mail"))
      .filter((n) => n.startsWith("reset-"))
      .map(async (n) => JSON.parse(await readFile(".local/mail/" + n, "utf8"))),
  );
  const mail = messages.find((m) => m.to === email);
  expect(mail.delivery).toBe("LOCAL_PREVIEW_ONLY");
  const token = mail.text.match(/token=([a-f0-9]+)/)[1];
  const otherTokens = messages
    .filter((m) => m.to === email && m !== mail)
    .map((m) => m.text.match(/token=([a-f0-9]+)/)[1]);
  const newPassword = `Changed-${randomUUID()}`;
  expect(
    (
      await student.request.post("/api/password-reset", {
        headers,
        data: { token, password: newPassword },
      })
    ).status(),
  ).toBe(200);
  expect((await student.request.get("/api/profile")).status()).toBe(401);
  expect(
    (
      await student.request.post("/api/password-reset", {
        headers,
        data: { token, password: newPassword },
      })
    ).status(),
  ).toBe(400);
  for (const oldToken of otherTokens)
    expect(
      (
        await student.request.post("/api/password-reset", {
          headers,
          data: { token: oldToken, password: newPassword },
        })
      ).status(),
    ).toBe(400);
  await signIn(student, email, newPassword, "student");
  await context.close();
});
