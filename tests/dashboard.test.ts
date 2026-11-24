import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import { getData } from "../src/services/platform";
import type { Actor } from "../src/lib/auth";
import { moveDay, weekDays } from "../src/lib/dashboard";

const users: Actor[] = [], batches: string[] = [];
let subjectId: string, chapterId: string;
const tag = crypto.randomUUID();
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("/spark_test")) throw new Error("Use isolated test database");
  for (const role of ["STUDENT", "STUDENT", "TEACHER", "TEACHER"] as const)
    users.push(await db.user.create({ data: { role, name: "Dashboard test", email: `${crypto.randomUUID()}@dashboard.test`, passwordHash: "unused-test-only" } }));
  for (const name of ["Own", "Other"])
    batches.push((await db.batch.create({ data: { name: `${name} ${tag}`, className: "HSC" } })).id);
  subjectId = (await db.subject.create({ data: { name: "Dashboard " + tag } })).id;
  chapterId = (await db.chapter.create({ data: { subjectId, name: "Motion" } })).id;
  await db.enrollment.createMany({ data: [
    { userId: users[0].id, batchId: batches[0] },
    { userId: users[1].id, batchId: batches[0] },
    { userId: users[1].id, batchId: batches[1] },
  ] });
  await db.teacherAssignment.createMany({ data: [2, 3].map((index) => ({ userId: users[index].id, batchId: batches[0], subjectId })) });
  await db.classRoutine.createMany({ data: [
    { batchId: batches[0], teacherId: users[2].id, subject: "Starts in Dhaka day", location: "Room A", startsAt: new Date("2026-12-01T00:30:00+06:00"), endsAt: new Date("2026-12-01T01:30:00+06:00") },
    { batchId: batches[0], teacherId: users[2].id, subject: "Across midnight", location: "Room A", startsAt: new Date("2026-11-30T23:30:00+06:00"), endsAt: new Date("2026-12-01T00:30:00+06:00") },
    { batchId: batches[0], teacherId: users[2].id, subject: "Next day", location: "Room A", startsAt: new Date("2026-12-02T00:00:00+06:00"), endsAt: new Date("2026-12-02T01:00:00+06:00") },
    { batchId: batches[0], teacherId: users[3].id, subject: "Other teacher", location: "Room B", startsAt: new Date("2026-12-01T10:00:00+06:00"), endsAt: new Date("2026-12-01T11:00:00+06:00") },
    { batchId: batches[1], teacherId: users[2].id, subject: "Other batch", location: "Room C", startsAt: new Date("2026-12-01T10:00:00+06:00"), endsAt: new Date("2026-12-01T11:00:00+06:00") },
  ] });
  const now = Date.now();
  const exam = { batchId: batches[0], chapterId, durationMinutes: 30, published: true, startsAt: new Date(now - 3 * 86_400_000), endsAt: new Date(now - 2 * 86_400_000), releaseAt: new Date(now - 86_400_000) };
  await db.exam.createMany({ data: [
    ...Array.from({ length: 21 }, (_, index) => ({ ...exam, title: `Closed exam ${index}` })),
    { ...exam, title: "Next chapter exam", startsAt: new Date(now + 86_400_000), endsAt: new Date(now + 2 * 86_400_000) },
    { ...exam, title: "Draft exam", published: false, endsAt: new Date(now + 86_400_000) },
    { ...exam, title: "Another batch exam", batchId: batches[1], endsAt: new Date(now + 86_400_000) },
  ] });
  for (let i = 0; i < 3; i++) {
    const lesson = await db.lesson.create({ data: { batchId: batches[0], chapterId, title: `Lesson ${i}`, description: "", youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: i } });
    if (i < 2) await db.learningProgress.create({ data: { userId: users[0].id, lessonId: lesson.id } });
    await db.learningProgress.create({ data: { userId: users[1].id, lessonId: lesson.id } });
  }
  for (const [index, date] of ["2026-11-23", "2026-11-24"].entries())
    await db.attendanceSession.create({ data: { batchId: batches[0], date, records: { create: [{ userId: users[0].id, present: index === 0 }, { userId: users[1].id, present: true }] } } });
});
afterAll(async () => {
  await db.attendanceRecord.deleteMany({ where: { session: { batchId: { in: batches } } } });
  await db.attendanceSession.deleteMany({ where: { batchId: { in: batches } } });
  await db.learningProgress.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await db.lesson.deleteMany({ where: { batchId: { in: batches } } });
  await db.exam.deleteMany({ where: { batchId: { in: batches } } });
  await db.classRoutine.deleteMany({ where: { batchId: { in: batches } } });
  await db.enrollment.deleteMany({ where: { batchId: { in: batches } } });
  await db.teacherAssignment.deleteMany({ where: { batchId: { in: batches } } });
  if (chapterId) await db.chapter.delete({ where: { id: chapterId } });
  if (subjectId) await db.subject.delete({ where: { id: subjectId } });
  await db.batch.deleteMany({ where: { id: { in: batches } } });
  await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  await db.$disconnect();
});

describe("Dashboard dates and actual academic data", () => {
  it("keeps a Monday-to-Sunday week through year and leap-day boundaries", () => {
    expect(weekDays("2027-01-03")).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(moveDay("2028-02-28", 1)).toBe("2028-02-29");
    expect(moveDay("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("selects classes by Dhaka day, includes cross-midnight classes and excludes other batches", async () => {
    const rows = await getData(users[0], "routines", new URLSearchParams({ date: "2026-12-01" })) as { subject: string }[];
    expect(rows.map((r) => r.subject)).toEqual(["Across midnight", "Starts in Dhaka day", "Other teacher"]);
    await expect(getData(users[0], "routines", new URLSearchParams({ date: "2026-02-30" }))).rejects.toThrow();
    const next = await getData(users[0], "routines", new URLSearchParams({ date: "2026-12-02" })) as { subject: string }[];
    expect(next.map((r) => r.subject)).toEqual(["Next day"]);
  });
  it("keeps teacher daily routines limited to their own assigned classes", async () => {
    const rows = await getData(users[2], "routines", new URLSearchParams({ date: "2026-12-01" })) as { subject: string }[];
    expect(rows.map((r) => r.subject)).toEqual(["Across midnight", "Starts in Dhaka day"]);
  });
  it("keeps open exams visible even when older closed exams fill the first history page", async () => {
    const rows = await getData(users[0], "exams", new URLSearchParams({ open: "true" })) as { title: string }[];
    expect(rows.map((r) => r.title)).toEqual(["Next chapter exam"]);
  });
  it("uses only the current student's attendance and lesson completion in the overview", async () => {
    expect(await getData(users[0], "dashboard", new URLSearchParams())).toMatchObject({ lessons: 3, completedLessons: 2, progress: 66.67, attendance: 50, attendanceSummary: { total: 2, present: 1, absent: 1 }, resultCount: 0 });
    expect(await getData(users[1], "dashboard", new URLSearchParams())).toMatchObject({ completedLessons: 3, attendance: 100, attendanceSummary: { total: 2, present: 2, absent: 0 } });
  });
});
