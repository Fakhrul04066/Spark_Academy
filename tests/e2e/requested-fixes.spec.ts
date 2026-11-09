import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
async function login(page: Page, role: string) {
  await page.goto("/login");
  await expect(page.locator(".auth-form .brand img")).toHaveAttribute(
    "src",
    "/spark-mark.svg?v=4",
  );
  await page
    .getByLabel("Email address")
    .fill(role === "admin" ? "admin@spark.example" : role + "1@spark.example");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.DEMO_SEED_PASSWORD!);
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/" + role + "$"), {
    timeout: 60000,
  });
  expect((await page.request.get("/api/profile")).status()).toBe(200);
}
for (const role of ["student", "teacher", "admin"])
  test(`${role} demo login and updated logo`, async ({ page }) => {
    await login(page, role);
  });
test("revision circle checkboxes update lights; private doubt images upload and display", async ({
  page,
  browser,
}) => {
  const db = new PrismaClient();
  let topicId: string | undefined,
    questionId: string | undefined,
    imageId: string | undefined;
  const headers = { Origin: "http://127.0.0.1:3000" };
  try {
    await login(page, "student");
    const student = await db.user.findUniqueOrThrow({
      where: { email: "student1@spark.example" },
      include: { enrollments: true },
    });
    const teacher = await db.user.findUniqueOrThrow({
      where: { email: "teacher1@spark.example" },
    });
    const assignment = await db.teacherAssignment.findFirstOrThrow({
      where: {
        userId: teacher.id,
        batchId: { in: student.enrollments.map((e) => e.batchId) },
      },
      include: { subject: { include: { chapters: true } } },
    });
    const name = "QA revision " + crypto.randomUUID().slice(0, 8);
    const response = await page.request.post("/api/revision", {
      headers,
      data: {
        chapterId: assignment.subject.chapters[0].id,
        name,
        learningDate: "2026-11-09",
        status: "RED",
      },
    });
    expect(response.status()).toBe(201);
    topicId = (await response.json()).data.id;
    await page.goto("/student/revision");
    const card = page
      .locator(".card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) })
      .last();
    await expect(card.locator(".status.RED")).toBeVisible();
    const checks = card.getByRole("checkbox");
    await expect(checks).toHaveCount(5);
    await checks.nth(0).check();
    await expect(card.locator(".status.YELLOW")).toBeVisible();
    for (let i = 1; i < 5; i++) {
      await checks.nth(i).check();
      await expect(checks.nth(i)).toBeChecked();
    }
    await expect(card.locator(".status.GREEN")).toBeVisible();
    await page.reload();
    await expect(card.locator(".status.GREEN")).toBeVisible();
    await checks.nth(0).uncheck();
    await expect(card.locator(".status.YELLOW")).toBeVisible();
    await page.goto("/student/questions");
    await page.getByRole("button", { name: "Add question", exact: true }).click();
    await page
      .getByLabel("Batch", { exact: true })
      .selectOption(assignment.batchId);
    await page
      .getByLabel("Subject", { exact: true })
      .selectOption(assignment.subjectId);
    const title = "QA image " + crypto.randomUUID().slice(0, 8);
    await page.getByLabel("Topic", { exact: true }).fill(title);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    );
    await page
      .getByLabel("Attach an image (optional)")
      .setInputFiles({ name: "math.png", mimeType: "image/png", buffer: png });
    await expect(
      page.getByText("Image attached", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    const question = await db.anonymousQuestion.findFirstOrThrow({
      where: { userId: student.id, topic: title },
    });
    questionId = question.id;
    imageId = question.imageId!;
    const img = page.getByAltText("Attached doubt illustration").first();
    await expect(img).toBeVisible();
    expect(
      await img.evaluate(
        (e: HTMLImageElement) => e.complete && e.naturalWidth > 0,
      ),
    ).toBe(true);
    const anonymous = await browser.newContext();
    expect(
      (
        await anonymous.request.get(
          "http://127.0.0.1:3000/api/question-images/" + imageId,
        )
      ).status(),
    ).toBe(401);
    await anonymous.close();
    const context = await browser.newContext();
    const teacherPage = await context.newPage();
    await login(teacherPage, "teacher");
    expect(
      (
        await teacherPage.request.get("/api/question-images/" + imageId)
      ).status(),
    ).toBe(200);
    const rows = (
      await (await teacherPage.request.get("/api/questions")).json()
    ).data;
    expect(rows.find((q: any) => q.id === questionId)).not.toHaveProperty(
      "userId",
    );
    await context.close();
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await other.goto("/login");
    await other.getByLabel("Email address").fill("student2@spark.example");
    await other
      .getByLabel("Password", { exact: true })
      .fill(process.env.DEMO_SEED_PASSWORD!);
    await other.getByRole("button", { name: "Sign in →", exact: true }).click();
    await expect(other).toHaveURL(/\/student$/);
    expect(
      (await other.request.get("/api/question-images/" + imageId)).status(),
    ).toBe(403);
    await otherContext.close();
    await page.screenshot({
      path: "test-results/doubt-image-" + test.info().project.name + ".png",
      fullPage: true,
    });
  } finally {
    if (questionId)
      await db.anonymousQuestion.delete({ where: { id: questionId } });
    if (imageId) await db.audioAttachment.delete({ where: { id: imageId } });
    if (topicId) {
      await db.googleSheetSyncJob.deleteMany({ where: { topicId } });
      await db.revisionSchedule.deleteMany({ where: { topicId } });
      await db.revisionTopic.delete({ where: { id: topicId } });
    }
    await db.$disconnect();
  }
});

