import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
const db = new PrismaClient();
test.beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL || "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname))
    throw new Error("E2E tests must use the local synthetic database");
  await db.rateLimit.deleteMany({
    where: {
      key: {
        in: [
          "login:student1@spark.example",
          "login:teacher1@spark.example",
          "login:teacher2@spark.example",
          "login:teacher3@spark.example",
          "login:admin@spark.example",
        ],
      },
    },
  });
});
async function login(page: Page, role: "student" | "teacher" | "admin") {
  await page.goto("/login");
  await page
    .getByLabel("Email address")
    .fill(role === "admin" ? "admin@spark.example" : `${role}1@spark.example`);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.DEMO_SEED_PASSWORD!);
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/" + role + "$"), {
    timeout: 60000,
  });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Latest results", exact: true }),
  ).toBeVisible();
}
test.afterAll(async () => db.$disconnect());
test("public page is responsive and contains no excluded session offering", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your learning journey/ }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("EduTrack");
  await expect(page.locator("body")).not.toContainText("1:1");
  await expect(page.locator("footer")).toContainText(
    "© Spark Academy. All rights reserved.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/landing-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
for (const role of ["student", "teacher", "admin"] as const)
  test(`${role} login, role protection and working navigation`, async ({
    page,
  }, testInfo) => {
    await login(page, role);
    await expect(page.locator("body")).not.toContainText(
      "The operation could not be completed",
    );
    await page.screenshot({
      path: `test-results/${role}-${testInfo.project.name}.png`,
      fullPage: true,
    });
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Toggle navigation" }).click();
    }
    const links = await page
      .locator(".sidebar nav a")
      .evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLAnchorElement).pathname),
      );
    for (const href of links) {
      await page.goto(href);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByText(
          "The operation could not be completed. Please try again.",
          { exact: false },
        ),
      ).not.toBeVisible();
    }
    const response = await page.request.get(
      role === "student"
        ? "/api/students"
        : role === "teacher"
          ? "/api/feedback"
          : "/api/reports",
    );
    expect(response.status()).toBe(role === "admin" ? 200 : 403);
  });
test("student lessons, revision topic, private feedback and exam autosave flow", async ({
  page,
}, testInfo) => {
  await login(page, "student");
  await page.goto("/student/lessons");
  const lesson = page.getByRole("link", { name: /Watch on YouTube/ }).first();
  await expect(lesson).toHaveAttribute(
    "href",
    "https://www.youtube.com/watch?v=89SjJv30kGU",
  );
  await expect(lesson).toHaveAttribute("target", "_blank");
  await page.goto("/student/revision");
  await page.getByRole("button", { name: "Add topic", exact: true }).click();
  await page.getByLabel("Chapter", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Topic name").fill("E2E topic " + Date.now());
  await page.getByLabel("Understanding", { exact: true }).selectOption("RED");
  await page.getByRole("button", { name: "Save topic" }).click();
  await expect(page.getByRole("status")).toContainText("Saved successfully.");
  await page.goto("/student/feedback");
  await page.getByRole("button", { name: "Add feedback", exact: true }).click();
  await page.getByLabel("Teacher", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Category", { exact: true }).selectOption("Suggestion");
  await page.getByLabel("Subject", { exact: true }).fill("E2E feedback");
  await page
    .getByLabel("Private message to admin")
    .fill("Please add more practice examples.");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("status")).toContainText("Saved successfully.");
  const student = await db.user.findUniqueOrThrow({
    where: { email: "student1@spark.example" },
    include: { enrollments: true },
  });
  const chapter = await db.chapter.findFirstOrThrow({
    where: { subject: { name: "Physics" } },
  });
  const exam = await db.exam.create({
    data: {
      title: "E2E exam " + Date.now(),
      chapterId: chapter.id,
      batchId: student.enrollments[0].batchId,
      published: true,
      durationMinutes: 10,
      startsAt: new Date(Date.now() - 60000),
      endsAt: new Date(Date.now() + 3600000),
      releaseAt: new Date(Date.now() + 3600000),
      questions: {
        create: {
          text: "Choose the SI unit of force.",
          marks: 2,
          order: 0,
          correctOption: 0,
          options: {
            create: ["Newton", "Joule", "Watt", "Volt"].map((text, order) => ({
              text,
              order,
            })),
          },
        },
      },
    },
  });
  await page.goto("/student/exams");
  const card = page.locator("article").filter({
    has: page.getByRole("heading", { name: exam.title, exact: true }),
  });
  await card.getByRole("button", { name: "Start / resume exam →" }).click();
  await expect(page).toHaveURL(/\/student\/attempt\//);
  await page.getByLabel("Newton", { exact: true }).check();
  await expect(page.getByRole("status")).toHaveText("Answers saved");
  await page.reload();
  await expect(page.getByLabel("Newton", { exact: true })).toBeChecked();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Submit examination", exact: true })
    .click();
  await expect(
    page.getByText(/Your answers have been submitted/),
  ).toBeVisible();
  await db.exam.update({
    where: { id: exam.id },
    data: { releaseAt: new Date(Date.now() - 1) },
  });
  await page.reload();
  await expect(page.getByText("2/2", { exact: true })).toBeVisible();
  const released = await (
    await page.request.get("/api/exam-attempts/" + page.url().split("/").pop())
  ).json();
  expect(released.data.durationSeconds).toBeGreaterThanOrEqual(0);
});
test("recorded Q&A is private and teacher can answer asynchronously", async ({
  page,
  browser,
}) => {
  await login(page, "student");
  const catalog = await (await page.request.get("/api/catalog")).json();
  const batchId = catalog.data.batches[0].id,
    subjectId = catalog.data.subjects[0].id;
  const recording = await page.evaluate(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise<Blob>(
      (resolve) =>
        (recorder.onstop = () =>
          resolve(new Blob(chunks, { type: recorder.mimeType }))),
    );
    recorder.start();
    setTimeout(() => recorder.stop(), 300);
    const blob = await stopped;
    stream.getTracks().forEach((t) => t.stop());
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const audio = await page.request.post("/api/audio", {
    headers: { Origin: "http://127.0.0.1:3000" },
    multipart: {
      audio: {
        name: "question.webm",
        mimeType: "audio/webm",
        buffer: Buffer.from(recording),
      },
    },
  });
  expect(audio.status()).toBe(201);
  const audioId = (await audio.json()).data.id;
  const question = await page.request.post("/api/questions", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: {
      batchId,
      subjectId,
      topic: "E2E voice question",
      text: "Why does inertia matter?",
      audioId,
    },
  });
  expect(question.status()).toBe(201);
  const questionId = (await question.json()).data.id;
  const anon = await browser.newContext();
  expect(
    (
      await anon.request.get(`http://127.0.0.1:3000/api/audio/${audioId}`)
    ).status(),
  ).toBe(401);
  await anon.close();
  const teacherContext = await browser.newContext();
  const teacher = await teacherContext.newPage();
  await login(teacher, "teacher");
  const qs = await (await teacher.request.get("/api/questions")).json();
  expect(JSON.stringify(qs)).not.toContain("student1@spark.example");
  const selected = qs.data.find((q: { id: string }) => q.id === questionId);
  if (selected) {
    const answer = await teacher.request.post("/api/question-replies", {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: {
        questionId,
        text: "Inertia is resistance to a change in motion.",
      },
    });
    expect(answer.status()).toBe(201);
  } else {
    const assigned = await db.teacherAssignment.findFirstOrThrow({
      where: { batchId, subjectId },
    });
    const user = await db.user.findUniqueOrThrow({
      where: { id: assigned.userId },
    });
    await teacher.goto("/login");
    await teacher.getByLabel("Email address").fill(user.email);
    await teacher
      .getByLabel("Password", { exact: true })
      .fill(process.env.DEMO_SEED_PASSWORD!);
    await teacher.getByRole("button", { name: "Sign in →" }).click();
    await expect(teacher).toHaveURL(/\/teacher$/);
    expect(
      (
        await teacher.request.post("/api/question-replies", {
          headers: { Origin: "http://127.0.0.1:3000" },
          data: {
            questionId,
            text: "Inertia is resistance to a change in motion.",
          },
        })
      ).status(),
    ).toBe(201);
  }
  await teacherContext.close();
  const result = await (await page.request.get("/api/questions")).json();
  expect(
    JSON.stringify(
      result.data.find((q: { id: string }) => q.id === questionId),
    ),
  ).toContain("Anonymous Teacher");
});
