import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import type { Actor } from "../src/lib/auth";
import { getData, mutate } from "../src/services/platform";
import { readBilling, recordFee, recordPayment } from "../src/services/billing";

let admin: Actor, student: Actor, otherStudent: Actor, teacher: Actor;
const users: string[] = [];
const fee = (overrides = {}) => ({ requestId: crypto.randomUUID(), userId: student.id, title: "November tuition", amountMinor: 250000, dueDate: "2026-11-15", ...overrides });
const payment = (feeId: string, overrides = {}) => ({ requestId: crypto.randomUUID(), feeId, amountMinor: 100000, paidAt: "2026-11-10T04:00:00.000Z", method: "bKash", reference: "TEST-RECEIPT", ...overrides });
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("/spark_test")) throw new Error("Use isolated test database");
  const fixtures: Actor[] = [];
  for (const role of ["ADMIN", "STUDENT", "STUDENT", "TEACHER"] as const) {
    const user = await db.user.create({ data: { role, name: "Profile billing test", email: `${crypto.randomUUID()}@billing.test`, passwordHash: "test-only-unused" } });
    fixtures.push(user); users.push(user.id);
  }
  [admin, student, otherStudent, teacher] = fixtures;
});
afterAll(async () => {
  await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
  await db.feePayment.deleteMany({ where: { fee: { userId: { in: users } } } });
  await db.studentFee.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});

describe("Profiles and payment records", () => {
  it("totals teacher earnings once per class and credited Q&A answer", async () => {
    const key = crypto.randomUUID();
    const batchId = `batch-${key}`;
    const subjectId = `subject-${key}`;
    const params = new URLSearchParams({ teacherId: teacher.id });
    try {
      await db.batch.create({ data: { id: batchId, name: batchId, className: "Test class" } });
      await db.subject.create({ data: { id: subjectId, name: subjectId } });
      const entries = Array.from({ length: 10 }, (_, index) => index);
      await db.teacherClassRecord.createMany({
        data: entries.map((index) => ({
          teacherId: teacher.id, batchId, subjectId, date: "2026-11-15", classNumber: index + 1,
          paid: index < 4, amountMinor: index < 4 ? 2500 : 4000,
        })),
      });
      await db.anonymousQuestion.createMany({
        data: entries.map((index) => ({
          id: `${key}-${index}`, userId: student.id, batchId, subjectId, topic: "Test Q&A", text: "Question",
        })),
      });
      await db.questionReply.createMany({
        data: entries.map((index) => ({
          id: `reply-${key}-${index}`, questionId: `${key}-${index}`, userId: teacher.id,
          text: "Answer", createdAt: new Date("2026-11-15T09:00:00Z"),
        })),
      });
      const followUp = await db.questionReply.create({
        data: { questionId: `${key}-0`, userId: teacher.id, text: "Another reply", createdAt: new Date("2026-11-15T10:00:00Z") },
      });
      const update = { id: `reply-${key}-0`, kind: "qna", paid: true };
      await expect(mutate(teacher, "teacher-payments", "PATCH", update)).rejects.toThrow("Access denied");
      await expect(getData(student, "teacher-payments", params)).rejects.toThrow("Access denied");
      await expect(mutate(admin, "teacher-payments", "PATCH", { ...update, id: followUp.id })).rejects.toThrow("credited teacher answer");
      await mutate(admin, "teacher-payments", "PATCH", update);
      const classInfo = {
        teacherId: teacher.id, batchId, subjectId, date: "2026-11-15", classNumber: 11,
        amountTaka: "31.25", payment: "Unpaid", adminComment: "",
      };
      await expect(mutate(teacher, "class-records", "POST", classInfo)).rejects.toThrow("Access denied");
      await expect(mutate(admin, "class-records", "POST", { ...classInfo, amountTaka: "31.255" })).rejects.toThrow();
      const created = await mutate(admin, "class-records", "POST", classInfo);
      await mutate(admin, "class-records", "PATCH", { ...classInfo, id: created.id, amountTaka: "32.50" });
      const expected = { totalMinor: 40250, paidMinor: 10300, dueMinor: 29950, classCount: 11, answerCount: 10, classTotalMinor: 37250, answerRate: 300 };
      expect(await getData(admin, "teacher-payments", params)).toMatchObject(expected);
      expect(await getData(teacher, "teacher-payments", new URLSearchParams({ teacherId: admin.id }))).toMatchObject(expected);
    } finally {
      await db.questionReply.deleteMany({ where: { question: { subjectId } } });
      await db.anonymousQuestion.deleteMany({ where: { subjectId } });
      await db.teacherClassRecord.deleteMany({ where: { subjectId } });
      await db.subject.deleteMany({ where: { id: subjectId } });
      await db.batch.deleteMany({ where: { id: batchId } });
    }
  });
  it("lists each assigned subject once on the teacher profile", async () => {
    const key = crypto.randomUUID();
    const subjectId = `subject-${key}`;
    const batchIds = [`batch-a-${key}`, `batch-b-${key}`];
    expect(await getData(teacher, "profile", new URLSearchParams())).toMatchObject({ subjects: [] });
    try {
      const subject = await db.subject.create({ data: { id: subjectId, name: subjectId } });
      await db.batch.createMany({
        data: batchIds.map((id) => ({ id, name: id, className: "Test class" })),
      });
      await db.teacherAssignment.createMany({
        data: batchIds.map((batchId) => ({ userId: teacher.id, subjectId, batchId })),
      });
      expect(await getData(teacher, "profile", new URLSearchParams())).toMatchObject({ subjects: [subject] });
      expect(await getData(student, "profile", new URLSearchParams())).not.toHaveProperty("subjects");
    } finally {
      await db.teacherAssignment.deleteMany({ where: { subjectId } });
      await db.batch.deleteMany({ where: { id: { in: batchIds } } });
      await db.subject.deleteMany({ where: { id: subjectId } });
    }
  });
  it("allows only admins to assign unique teacher IDs", async () => {
    const teacherCode = `T-${crypto.randomUUID()}`;
    const id = teacher.id;
    await expect(mutate(teacher, "profile", "PATCH", { name: teacher.name, teacherCode })).rejects.toThrow();
    await expect(mutate(teacher, "teachers", "PATCH", { id, teacherCode })).rejects.toThrow("Access denied");
    await mutate(admin, "teachers", "PATCH", { id, teacherCode: ` ${teacherCode} ` });
    expect(await getData(teacher, "profile", new URLSearchParams())).toMatchObject({ teacherCode });

    const email = `${crypto.randomUUID()}@billing.test`;
    const newTeacher = { name: "New teacher", email, password: "test-only-password" };
    await expect(mutate(admin, "teachers", "POST", { ...newTeacher, teacherCode })).rejects.toMatchObject({ code: "P2002" });

    await mutate(admin, "teachers", "PATCH", { id, teacherCode: "" });
    expect(await getData(teacher, "profile", new URLSearchParams())).toMatchObject({ teacherCode: null });
    const created = await mutate(admin, "teachers", "POST", { ...newTeacher, teacherCode });
    if (created && "id" in created && typeof created.id === "string") users.push(created.id);
    expect(await db.user.findUnique({ where: { email } })).toMatchObject({ teacherCode });
  });
  it("persists each valid blood group on the signed-in account and supports clearing it", async () => {
    for (const bloodGroup of ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]) {
      await mutate(student, "profile", "PATCH", { name: student.name, bloodGroup });
      expect(await getData(student, "profile", new URLSearchParams())).toMatchObject({ bloodGroup });
    }
    await mutate(student, "profile", "PATCH", { name: student.name, bloodGroup: "" });
    expect((await db.user.findUniqueOrThrow({ where: { id: student.id } })).bloodGroup).toBeNull();
    await expect(mutate(student, "profile", "PATCH", { name: student.name, bloodGroup: "XX" })).rejects.toThrow();
    await expect(mutate(student, "profile", "PATCH", { name: student.name, bloodGroup: "A+", id: otherStudent.id })).rejects.toThrow();
    expect((await db.user.findUniqueOrThrow({ where: { id: otherStudent.id } })).bloodGroup).toBeNull();
  });
  it("returns an empty ledger without inventing fees or paid records", async () => {
    expect(await readBilling(otherStudent)).toEqual({ fees: [], payments: [], totalDueMinor: 0, totalPaidMinor: 0 });
  });
  it("allows only admins to add fees or payments and rejects other-account reads", async () => {
    for (const actor of [student, teacher]) {
      await expect(recordFee(actor, fee())).rejects.toThrow("Access denied");
      await expect(recordPayment(actor, payment("anything"))).rejects.toThrow("Access denied");
    }
    await expect(readBilling(student, otherStudent.id)).rejects.toThrow("Access denied");
    await expect(readBilling(teacher, student.id)).rejects.toThrow("Access denied");
  });
  it("calculates partial dues, preserves receipt details and handles retries without duplicates", async () => {
    const input = fee();
    const charge = await mutate(admin, "fee-charges", "POST", input);
    expect(await recordFee(admin, input)).toEqual(charge);
    await expect(recordFee(admin, { ...input, amountMinor: 1 })).rejects.toThrow("different fee");
    const receipt = payment(charge.id!);
    const saved = await mutate(admin, "fee-payments", "POST", receipt);
    expect(await recordPayment(admin, receipt)).toEqual(saved);
    await expect(recordPayment(admin, { ...receipt, reference: "CHANGED" })).rejects.toThrow("different payment");
    const result = await readBilling(student);
    expect(result.fees).toHaveLength(1);
    expect(result.totalDueMinor).toBe(150000);
    expect(result.totalPaidMinor).toBe(100000);
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0]).toMatchObject({ amountMinor: 100000, reference: "TEST-RECEIPT", method: "bKash", title: input.title });
    expect(await readBilling(admin, student.id)).toEqual(result);
    expect((await readBilling(otherStudent)).fees).toHaveLength(0);
    expect(await db.auditLog.count({ where: { actorId: admin.id, action: "billing.payment.record", resource: saved.id } })).toBe(1);
  });
  it("rejects invalid amounts, dates and payments larger than the balance", async () => {
    for (const amountMinor of [0, -1, 1.5, 100_000_001]) await expect(recordFee(admin, fee({ amountMinor }))).rejects.toThrow();
    await expect(recordFee(admin, fee({ dueDate: "2026-02-30" }))).rejects.toThrow();
    const charge = await recordFee(admin, fee({ amountMinor: 10001 }));
    await expect(recordPayment(admin, payment(charge.id, { amountMinor: 10002 }))).rejects.toThrow("exceeds");
    await expect(recordPayment(admin, payment(charge.id, { paidAt: "2099-01-01T00:00:00Z" }))).rejects.toThrow("future");
    await recordPayment(admin, payment(charge.id, { amountMinor: 10001 }));
    const result = await readBilling(student);
    expect(result.fees.find((f) => f.id === charge.id)?.dueMinor).toBe(0);
  });
  it("serializes concurrent receipts so they cannot overpay a fee", async () => {
    const charge = await recordFee(admin, fee({ amountMinor: 10000 }));
    const outcomes = await Promise.allSettled([
      recordPayment(admin, payment(charge.id, { amountMinor: 7000 })),
      recordPayment(admin, payment(charge.id, { amountMinor: 7000 })),
    ]);
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await db.feePayment.aggregate({ where: { feeId: charge.id }, _sum: { amountMinor: true } }))._sum.amountMinor).toBe(7000);
    const retry = payment(charge.id, { amountMinor: 3000 });
    const receipts = await Promise.all([recordPayment(admin, retry), recordPayment(admin, retry)]);
    expect(receipts[0].id).toBe(receipts[1].id);
  });
});
