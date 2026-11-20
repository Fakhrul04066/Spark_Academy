import { manageQaAccess, readQa, readQaDiscussion, saveQa, updateQaSignal, writeQaDiscussion } from "../src/services/qa-access";
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
  await db.qaAccess.create({
    data: { userId: fixtures.student.id, batchId: b.id, kind: "PAID_STUDENT", expiresAt: new Date(Date.now() + 86_400_000) },
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
  it("automatically advances revision lights, supports undo, and preserves dates", async () => {
    const f = fixtures;
    const result = await mutate(f.student, "revision", "POST", {
      chapterId: f.chapter,
      name: "Automatic revision test",
      learningDate: dhakaDate(),
      status: "RED",
    });
    const read = () =>
      db.revisionTopic.findUniqueOrThrow({
        where: { id: result.id },
        include: { schedules: true },
      });
    let topic = await read();
    expect(topic.status).toBe("RED");
    expect(topic.schedules).toHaveLength(5);
    await expect(
      mutate(f.otherStudent, "revision-schedules", "PATCH", {
        id: topic.schedules[0].id,
      }),
    ).rejects.toThrow();
    await mutate(f.student, "revision-schedules", "PATCH", {
      id: topic.schedules[0].id,
    });
    expect((await read()).status).toBe("YELLOW");
    for (const schedule of topic.schedules.slice(1))
      await mutate(f.student, "revision-schedules", "PATCH", {
        id: schedule.id,
      });
    topic = await read();
    expect(topic.status).toBe("GREEN");
    expect(topic.schedules.filter((s) => s.completedAt)).toHaveLength(5);
    await mutate(f.student, "revision-schedules", "PATCH", {
      id: topic.schedules[0].id,
      completed: false,
    });
    expect((await read()).status).toBe("YELLOW");
    for (const schedule of topic.schedules)
      await mutate(f.student, "revision-schedules", "PATCH", {
        id: schedule.id,
        completed: false,
      });
    topic = await read();
    expect(topic.status).toBe("RED");
    expect(topic.schedules).toHaveLength(5);
  });
  it("allows only owned unattached images and keeps student identity private", async () => {
    const f = fixtures;
    const image = await db.audioAttachment.create({
      data: {
        ownerId: f.student.id,
        key: "avatars/" + crypto.randomUUID(),
        mime: "image/png",
        bytes: 68,
      },
    });
    await expect(
      mutate(f.otherStudent, "questions", "POST", {
        batchId: f.batch,
        subjectId: f.subject,
        topic: "Image",
        text: "",
        imageId: image.id,
      }),
    ).rejects.toThrow();
    const question = await mutate(f.student, "questions", "POST", {
      batchId: f.batch,
      subjectId: f.subject,
      topic: "Image",
      text: "",
      imageId: image.id,
    });
    const rows = await getData(f.teacher, "questions", new URLSearchParams());
    const row = (rows as any[]).find((r) => r.id === question.id);
    expect(row.imageId).toBe(image.id);
    expect(row).not.toHaveProperty("userId");
    await expect(
      mutate(f.student, "questions", "POST", {
        batchId: f.batch,
        subjectId: f.subject,
        topic: "Reuse",
        text: "",
        imageId: image.id,
      }),
    ).rejects.toThrow();
  });
  it("attaches up to four distinct images and records the selected chapter", async () => {
    const f = fixtures;
    const attachments = await Promise.all(Array.from({ length: 5 }, () =>
      db.audioAttachment.create({ data: {
        ownerId: f.student.id, key: "avatars/" + crypto.randomUUID(), mime: "image/png", bytes: 68,
      } }),
    ));
    const images = attachments.map(({ id }) => id);
    const form = { batchId: f.batch, subjectId: f.subject, qaChapterId: f.chapter, topic: "Diagram set", text: "" };
    await expect(mutate(f.student, "questions", "POST", { ...form, imageIds: images })).rejects.toThrow();
    await expect(mutate(f.student, "questions", "POST", { ...form, imageIds: [images[0], images[0]] })).rejects.toMatchObject({ status: 400 });
    const question = await mutate(f.student, "questions", "POST", { ...form, imageIds: images.slice(0, 4) });
    const board = await readQa(f.student, new URLSearchParams({ q: "Motion" }));
    expect(board.items.find((item) => item.id === question.id)).toMatchObject({
      chapter: "Motion", images: images.slice(0, 4),
    });
    await expect(mutate(f.student, "questions", "POST", { ...form, imageId: images[3], text: "Reuse" })).rejects.toMatchObject({ status: 400 });
  });
  it("enforces a single monthly Q&A quota for a Q&A-only subscriber under concurrent submissions", async () => {
    const f = fixtures;
    const question = { batchId: f.batch, subjectId: f.subject, topic: "Quota boundaries", text: "How does force change?" };
    await expect(mutate(f.otherStudent, "questions", "POST", question)).rejects.toMatchObject({ status: 403 });
    const expiresOn = dhakaDate(new Date(Date.now() + 86_400_000));
    const access = { email: f.otherStudent.email, batchId: f.batch, kind: "QNA_ONLY", expiresOn };
    await expect(manageQaAccess(f.otherStudent, access)).rejects.toMatchObject({ status: 403 });
    await manageQaAccess(f.admin, access);
    await expect(academicAccess(f.otherStudent, f.batch)).rejects.toMatchObject({ status: 403 });
    const month = dhakaDate().slice(0, 7);
    const boundary = new Date(month + "-01T00:00:00+06:00");
    await db.anonymousQuestion.createMany({ data: [
      { ...question, userId: f.otherStudent.id, createdAt: new Date(+boundary - 1) },
      ...Array.from({ length: 29 }, () => ({ ...question, userId: f.otherStudent.id, createdAt: boundary })),
    ] });
    const requests = await Promise.allSettled([1, 2].map(() => mutate(f.otherStudent, "questions", "POST", { ...question, shareWithClass: true })));
    const [accepted] = requests.filter((result) => result.status === "fulfilled");
    const [blocked] = requests.filter((result) => result.status === "rejected");
    expect(requests.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(blocked?.reason).toMatchObject({ status: 429 });
    expect((await readQa(f.otherStudent, new URLSearchParams())).remaining).toBe(0);
    const questionId = accepted.value.id;
    if (!questionId) throw new Error("The accepted submission did not return a question ID.");
    await expect(saveQa(f.student, { questionId, saved: true })).rejects.toMatchObject({ status: 403 });
    const voterQuota = (await readQa(f.student, new URLSearchParams())).remaining;
    await expect(updateQaSignal(f.student, { questionId, action: "sameDoubt", value: true })).rejects.toMatchObject({ status: 403 });
    await mutate(f.otherStudent, "questions", "PATCH", { id: questionId, shareWithClass: true, shareWhilePending: true });
    await updateQaSignal(f.student, { questionId, action: "sameDoubt", value: true });
    const pending = await readQa(f.student, new URLSearchParams());
    expect(pending.items.find((item) => item.id === questionId)).toMatchObject({
      mine: false, replies: [], sameDoubtCount: 1, sameDoubt: true,
    });
    expect(pending.remaining).toBe(voterQuota);
    await updateQaSignal(f.student, { questionId, action: "sameDoubt", value: false });
    expect((await readQa(f.student, new URLSearchParams())).items.find((item) => item.id === questionId)).toMatchObject({ sameDoubt: false, sameDoubtCount: 0 });
    await mutate(f.otherStudent, "questions", "PATCH", { id: questionId, shareWhilePending: false });
    expect((await readQa(f.student, new URLSearchParams())).items.some((item) => item.id === questionId)).toBe(false);

    await mutate(f.teacher, "question-replies", "POST", { questionId, text: "By Newton's second law." });
    await saveQa(f.student, { questionId, saved: true });
    await updateQaSignal(f.student, { questionId, action: "sameDoubt", value: true });
    await updateQaSignal(f.student, { questionId, action: "understood", value: true });
    const saved = await readQa(f.student, new URLSearchParams({ tab: "saved" }));
    expect(saved.items.find((item) => item.id === questionId)).toMatchObject({ mine: false, saved: true, sameDoubtCount: 1, understood: true });
    await writeQaDiscussion(f.student, { questionId, text: "This solved my doubt." });
    const comments = await readQaDiscussion(f.otherStudent, questionId, new URLSearchParams());
    expect(comments.items[0]).toMatchObject({ author: "Anonymous student", text: "This solved my doubt." });
    expect((await readQa(f.student, new URLSearchParams())).remaining).toBe(voterQuota);
    await manageQaAccess(f.admin, { ...access, expiresOn: null });
    await expect(mutate(f.otherStudent, "questions", "POST", question)).rejects.toMatchObject({ status: 403 });
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
