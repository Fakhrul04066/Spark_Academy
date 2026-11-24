import { z } from "zod";
import { db } from "@/lib/db";
import type { Actor } from "@/lib/auth";
import { check } from "@/lib/security";

const amount = z.number().int().positive().max(100_000_000);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value;
}, "Invalid date");
const feeInput = z.object({
  requestId: z.uuid(), userId: z.string().min(1), title: z.string().trim().min(1).max(200),
  amountMinor: amount, dueDate: day,
}).strict();
const paymentInput = z.object({
  requestId: z.uuid(), feeId: z.string().min(1), amountMinor: amount,
  paidAt: z.iso.datetime({ offset: true }).refine((value) => +new Date(value) <= Date.now(), "Payment date cannot be in the future"),
  method: z.enum(["Cash", "bKash", "Nagad", "Bank transfer", "Other"]),
  reference: z.string().trim().max(100).default(""),
}).strict();

export async function readBilling(actor: Actor, studentId?: string | null) {
  check(actor.role === "ADMIN" || actor.role === "STUDENT");
  // A student cannot select another account through query parameters.
  check(actor.role === "ADMIN" || !studentId || studentId === actor.id);
  const userId = actor.role === "STUDENT" ? actor.id : studentId;
  check(userId, 400, "Select a student");
  const student = await db.user.findFirst({ where: { id: userId, role: "STUDENT" }, select: { id: true } });
  check(student, 404, "Student not found");
  const rows = await db.studentFee.findMany({
    where: { userId }, orderBy: [{ dueDate: "desc" }, { id: "desc" }],
    include: { payments: { orderBy: [{ paidAt: "desc" }, { id: "desc" }] } },
  });
  const fees = rows.map(({ payments, ...fee }) => {
    const paidMinor = payments.reduce((sum, p) => sum + p.amountMinor, 0);
    return { ...fee, paidMinor, dueMinor: fee.amountMinor - paidMinor };
  });
  const payments = rows.flatMap((fee) => fee.payments.map((p) => ({ ...p, title: fee.title })))
    .sort((a, b) => +b.paidAt - +a.paidAt);
  return {
    fees, payments,
    totalDueMinor: fees.reduce((sum, f) => sum + f.dueMinor, 0),
    totalPaidMinor: payments.reduce((sum, p) => sum + p.amountMinor, 0),
  };
}

export async function recordFee(actor: Actor, body: unknown) {
  check(actor.role === "ADMIN");
  const data = feeInput.parse(body);
  const student = await db.user.findFirst({ where: { id: data.userId, role: "STUDENT" }, select: { id: true } });
  check(student, 404, "Student not found");
  return db.$transaction(async (tx) => {
    // Upsert and compare makes a network retry safe, without changing an existing fee.
    const fee = await tx.studentFee.upsert({ where: { requestId: data.requestId }, create: data, update: {} });
    check(fee.userId === data.userId && fee.title === data.title && fee.amountMinor === data.amountMinor && fee.dueDate === data.dueDate,
      409, "This request was already used for a different fee");
    await tx.auditLog.create({ data: { actorId: actor.id, action: "billing.fee.record", resource: fee.id } });
    return { id: fee.id };
  });
}

export async function recordPayment(actor: Actor, body: unknown) {
  check(actor.role === "ADMIN");
  const data = paymentInput.parse(body);
  return db.$transaction(async (tx) => {
    // Serialize receipts per fee so concurrent payments cannot exceed its balance.
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "StudentFee" WHERE "id" = ${data.feeId} FOR UPDATE`;
    check(locked.length, 404, "Fee not found");
    const previous = await tx.feePayment.findUnique({ where: { requestId: data.requestId } });
    if (previous) {
      check(previous.feeId === data.feeId && previous.amountMinor === data.amountMinor &&
        +previous.paidAt === +new Date(data.paidAt) && previous.method === data.method && (previous.reference || "") === data.reference,
      409, "This request was already used for a different payment");
      return { id: previous.id };
    }
    const fee = await tx.studentFee.findUniqueOrThrow({ where: { id: data.feeId } });
    const paid = await tx.feePayment.aggregate({ where: { feeId: fee.id }, _sum: { amountMinor: true } });
    check(data.amountMinor <= fee.amountMinor - (paid._sum.amountMinor || 0), 400, "Payment exceeds the remaining due");
    const payment = await tx.feePayment.create({ data: { ...data, paidAt: new Date(data.paidAt), reference: data.reference || null } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "billing.payment.record", resource: payment.id } });
    return { id: payment.id };
  });
}
