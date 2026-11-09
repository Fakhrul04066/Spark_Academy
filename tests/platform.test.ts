import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { hash } from "bcryptjs";
import { db } from "../src/lib/db";
import {
  mutate,
  getData,
  attemptAction,
  readAttempt,
} from "../src/services/platform";
import { academicAccess, type Actor } from "../src/lib/auth";
import { dhakaDate } from "../src/lib/domain";
import { runJobs } from "../src/services/revision";
const fixtures = {} as {
  admin: Actor;
  teacher: Actor;
  otherTeacher: Actor;
  student: Actor;
  otherStudent: Actor;
  batch: string;
  subject: string;
  chapter: string;
  exam: string;
  question: string;
};
beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes("/spark_test"))
    throw new Error("Tests require isolated spark_test database");
  const tag = crypto.randomUUID().slice(0, 8),
    passwordHash = await hash("LocalTestPasswordOnly", 4);
  for (const [key, role] of [
    ["admin", "ADMIN"],
    ["teacher", "TEACHER"],
    ["otherTeacher", "TEACHER"],
    ["student", "STUDENT"],
    ["otherStudent", "STUDENT"],
  ] as const) {
    const u = await db.user.create({
      data: {
        name: key,
        email: `${key}-${tag}@example.test`,
        role,
        passwordHash,
      },
    });
    fixtures[key] = u;
  }
  const b = await db.batch.create({
    data: { name: "Test " + tag, className: "HSC" },
  });
  fixtures.batch = b.id;
  const subject = await db.subject.create({ data: { name: "Physics " + tag } });
  fixtures.subject = subject.id;
  const chapter = await db.chapter.create({
    data: { name: "Motion", subjectId: subject.id },
  });
  fixtures.chapter = chapter.id;
  await db.enrollment.create({
    data: { userId: fixtures.student.id, batchId: b.id },
  });
  await db.teacherAssignment.create({
    data: { userId: fixtures.teacher.id, batchId: b.id, subjectId: subject.id },
  });
});
afterAll(async () => db.$disconnect());
describe("Database-backed permissions and workflows", () => {
  it("restricts account writes to administrators and prevents identity changes through profile payloads", async () => {
    const f = fixtures;
    await expect(
      mutate(f.teacher, "students", "POST", {
        name: "Invalid",
        email: "invalid@example.test",
        password: "LongEnoughPassword",
      }),
    ).rejects.toThrow("Access denied");
    await expect(
      mutate(f.student, "profile", "PATCH", { name: "Changed", role: "ADMIN" }),
    ).rejects.toThrow();
  });
  it("restricts teachers and students to assigned batches", async () => {
    await expect(
      academicAccess(fixtures.student, fixtures.batch, fixtures.subject),
    ).resolves.toBeUndefined();
    await expect(
      academicAccess(fixtures.otherStudent, fixtures.batch),
    ).rejects.toThrow("Access denied");
    await expect(
      academicAccess(fixtures.otherTeacher, fixtures.batch, fixtures.subject),
    ).rejects.toThrow("Access denied");
  });
  it("creates actual teacher lessons and explicit completion progress", async () => {
    const f = fixtures;
    const lesson = await mutate(f.teacher, "lessons", "POST", {
      title: "Newton’s laws",
      description: "Test lesson URL used only for validation",
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
      chapterId: f.chapter,
      batchId: f.batch,
      order: 0,
    });
    await mutate(f.student, "progress", "POST", {
      lessonId: lesson.id,
      completed: true,
    });
    const data = (await getData(
      f.student,
      "progress",
      new URLSearchParams(),
    )) as any[];
    expect(data[0].percentage).toBe(100);
    await expect(
      mutate(f.otherTeacher, "lessons", "PATCH", {
        id: lesson.id,
        title: "Changed",
        description: "",
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
        chapterId: f.chapter,
        batchId: f.batch,
        order: 0,
      }),
    ).rejects.toThrow();
  });
  it("keeps feedback private from teachers and other students", async () => {
    const f = fixtures;
    await mutate(f.student, "feedback", "POST", {
      teacherId: f.teacher.id,
      category: "Suggestion",
      subject: "Practice",
      message: "Please add another exercise.",
    });
    await expect(
      getData(f.teacher, "feedback", new URLSearchParams()),
    ).rejects.toThrow();
    const other = (await getData(
      f.otherStudent,
      "feedback",
      new URLSearchParams(),
    )) as unknown[];
    expect(other).toHaveLength(0);
    expect(
      (
        (await getData(
          f.student,
          "feedback",
          new URLSearchParams(),
        )) as unknown[]
      ).length,
    ).toBe(1);
  });
  it("hides Q&A identities in both directions and sends answer notifications", async () => {
    const f = fixtures;
    const q = await mutate(f.student, "questions", "POST", {
      batchId: f.batch,
      subjectId: f.subject,
      topic: "Inertia",
      text: "Why does this happen?",
    });
    f.question = q.id!;
    await mutate(f.teacher, "question-replies", "POST", {
      questionId: f.question,
      text: "Inertia resists changes in motion.",
    });
    const rows = await getData(f.teacher, "questions", new URLSearchParams());
    const json = JSON.stringify(rows);
    expect(json).not.toContain(f.student.id);
    expect(json).not.toContain(f.teacher.id);
    expect(json).toContain("Anonymous Teacher");
    await expect(
      mutate(f.otherTeacher, "question-replies", "POST", {
        questionId: f.question,
        text: "No access",
      }),
    ).rejects.toThrow();
  });
  it("upserts attendance without duplicate student records", async () => {
    const f = fixtures;
    const body = {
      batchId: f.batch,
      date: dhakaDate(),
      records: [{ userId: f.student.id, present: true }],
    };
    await mutate(f.teacher, "attendance", "POST", body);
    await mutate(f.teacher, "attendance", "POST", {
      ...body,
      records: [{ userId: f.student.id, present: false }],
    });
    const rows = (await getData(
      f.student,
      "attendance",
      new URLSearchParams(),
    )) as any[];
    expect(rows[0].records).toHaveLength(1);
    expect(rows[0].records[0].present).toBe(false);
    await expect(
      mutate(f.otherTeacher, "attendance", "POST", body),
    ).rejects.toThrow();
  });
  it("preserves completed revision history while replacing pending dates", async () => {
    const f = fixtures;
    const result = await mutate(f.student, "revision", "POST", {
      chapterId: f.chapter,
      name: "Newton’s laws",
      learningDate: dhakaDate(),
      status: "RED",
    });
    let t = await db.revisionTopic.findUniqueOrThrow({
      where: { id: result.id },
      include: { schedules: true },
    });
    expect(t.schedules).toHaveLength(5);
    await mutate(f.student, "revision-schedules", "PATCH", {
      id: t.schedules[0].id,
    });
    await mutate(f.student, "revision", "PATCH", {
      id: t.id,
      status: "YELLOW",
    });
    t = await db.revisionTopic.findUniqueOrThrow({
      where: { id: t.id },
      include: { schedules: true },
    });
    expect(t.schedules.filter((s) => s.completedAt)).toHaveLength(1);
    expect(
      t.schedules.filter((s) => !s.cancelled && !s.completedAt),
    ).toHaveLength(3);
    await mutate(f.student, "revision", "PATCH", { id: t.id, status: "GREEN" });
    expect(
      await db.revisionSchedule.count({
        where: { topicId: t.id, cancelled: false, completedAt: null },
      }),
    ).toBe(0);
  });
  it("creates, resumes, autosaves and grades an exam without leaking answer keys", async () => {
    const f = fixtures;
    const exam = await mutate(f.teacher, "exams", "POST", {
      title: "Test exam",
      chapterId: f.chapter,
      batchId: f.batch,
      durationMinutes: 5,
      attemptLimit: 1,
      published: true,
      startsAt: new Date(Date.now() - 60000).toISOString(),
      endsAt: new Date(Date.now() + 600000).toISOString(),
      releaseAt: new Date(Date.now() + 600000).toISOString(),
      questions: [
        {
          text: "The unit of force?",
          marks: 2,
          options: ["Newton", "Watt", "Joule", "Volt"],
          correctOption: 0,
        },
      ],
    });
    f.exam = exam.id!;
    const attempt = await attemptAction(f.student, "start", { examId: f.exam });
    const resumed = await attemptAction(f.student, "start", { examId: f.exam });
    expect(resumed.id).toBe(attempt.id);
    const a = await readAttempt(f.student, attempt.id!);
    expect(a.questions[0]).not.toHaveProperty("correctOption");
    await expect(readAttempt(f.otherStudent, attempt.id!)).rejects.toThrow();
    await attemptAction(f.student, "save", {
      id: attempt.id,
      answers: [{ questionId: a.questions[0].id, option: 0 }],
    });
    await attemptAction(f.student, "submit", { id: attempt.id });
    const hidden = await readAttempt(f.student, attempt.id!);
    expect(hidden).not.toHaveProperty("score");
    await db.exam.update({
      where: { id: f.exam },
      data: { releaseAt: new Date(Date.now() - 1) },
    });
    const result = await readAttempt(f.student, attempt.id!);
    expect(result.score).toBe(2);
    expect(result.correct).toBe(1);
    await expect(
      attemptAction(f.student, "start", { examId: f.exam }),
    ).rejects.toThrow("Attempt limit reached");
  });
  it("ignores answers received after the server deadline", async () => {
    const f = fixtures;
    await db.exam.update({ where: { id: f.exam }, data: { attemptLimit: 2 } });
    const a = await attemptAction(f.student, "start", { examId: f.exam });
    await db.examAttempt.update({
      where: { id: a.id },
      data: { deadline: new Date(Date.now() - 1000) },
    });
    const attempt = await db.examAttempt.findUniqueOrThrow({
      where: { id: a.id },
      include: { exam: { include: { questions: true } } },
    });
    await attemptAction(f.student, "submit", {
      id: a.id,
      answers: [{ questionId: attempt.exam.questions[0].id, option: 0 }],
    });
    expect(
      (await db.examAttempt.findUniqueOrThrow({ where: { id: a.id } })).score,
    ).toBe(0);
  });
  it("runs scheduled reminders idempotently and records real integration failures", async () => {
    const f = fixtures;
    const topic = await mutate(f.student, "revision", "POST", {
      chapterId: f.chapter,
      name: "Due today",
      learningDate: dhakaDate(),
      status: "RED",
    });
    const task = await db.revisionSchedule.findFirstOrThrow({
      where: { topicId: topic.id },
      orderBy: { dueDate: "asc" },
    });
    await db.revisionSchedule.update({
      where: { id: task.id },
      data: { dueDate: dhakaDate() },
    });
    await runJobs();
    await runJobs();
    const log = await db.revisionReminderLog.findUniqueOrThrow({
      where: { scheduleId: task.id },
    });
    expect(log.status).toBe("LOCAL_PREVIEW");
    expect(log.attempts).toBe(1);
    expect(
      await db.notification.count({
        where: { dedupeKey: `revision:${task.id}` },
      }),
    ).toBe(1);
    const sync = await db.googleSheetSyncJob.findFirstOrThrow({
      where: { topicId: topic.id },
    });
    expect(sync.status).toBe("FAILED");
    expect(sync.error).toContain("not configured");
  });
  it("rejects fractional pagination before querying records", async () => {
    await expect(
      getData(fixtures.admin, "batches", new URLSearchParams("page=1.5")),
    ).rejects.toThrow();
  });
  it("keeps overdue in-app reminders when email is disabled", async () => {
    const f = fixtures;
    await db.user.update({
      where: { id: f.student.id },
      data: { emailReminders: false },
    });
    const topic = await mutate(f.student, "revision", "POST", {
      chapterId: f.chapter,
      name: "Overdue with email off",
      learningDate: dhakaDate(),
      status: "RED",
    });
    const task = await db.revisionSchedule.findFirstOrThrow({
      where: { topicId: topic.id },
      orderBy: { dueDate: "asc" },
    });
    const yesterday = new Date(dhakaDate() + "T00:00:00Z");
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await db.revisionSchedule.update({
      where: { id: task.id },
      data: { dueDate: yesterday.toISOString().slice(0, 10) },
    });
    await runJobs();
    expect(
      await db.notification.count({
        where: { dedupeKey: `revision:${task.id}` },
      }),
    ).toBe(1);
    expect(
      await db.revisionReminderLog.count({ where: { scheduleId: task.id } }),
    ).toBe(0);
    await db.user.update({
      where: { id: f.student.id },
      data: { emailReminders: true },
    });
  });
  it("finalizes an expired examination without an open browser", async () => {
    const f = fixtures;
    await db.exam.update({ where: { id: f.exam }, data: { attemptLimit: 3 } });
    const a = await attemptAction(f.student, "start", { examId: f.exam });
    await db.examAttempt.update({
      where: { id: a.id },
      data: { deadline: new Date(Date.now() - 1000) },
    });
    await runJobs();
    const result = await db.examAttempt.findUniqueOrThrow({
      where: { id: a.id },
    });
    expect(result.submittedAt).not.toBeNull();
    expect(result.score).toBe(0);
  });

  it("stores database-default timestamps as actual instants", async () => {
    const user = await db.user.create({
      data: {
        name: "Timestamp fixture",
        email: `clock-${crypto.randomUUID()}@example.test`,
        role: "STUDENT",
        passwordHash: "not-a-login-account",
      },
    });
    expect(Math.abs(Date.now() - user.createdAt.getTime())).toBeLessThan(10000);
  });
});
