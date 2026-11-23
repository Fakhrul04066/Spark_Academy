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

describe("Student profile and payment records", () => {
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
