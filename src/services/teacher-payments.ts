import { z } from "zod";
import type { Actor } from "@/lib/auth";
import { db } from "@/lib/db";
import { dhakaDate } from "@/lib/domain";
import { check } from "@/lib/security";

// Amounts are stored and calculated in poisha.
const answerRate = 300;
const firstAnswerOrder = [{ createdAt: "asc" }, { id: "asc" }] as const;

export async function readTeacherPayments(actor: Actor, selectedTeacher: string | null) {
  check(actor.role === "TEACHER" || actor.role === "ADMIN");
  const teacherId = actor.role === "TEACHER" ? actor.id : selectedTeacher;
  if (!teacherId) return null;
  if (actor.role === "ADMIN") {
    const teacher = await db.user.findUnique({ where: { id: teacherId }, select: { role: true } });
    check(teacher?.role === "TEACHER", 404, "Teacher not found");
  }

  const [classes, questions] = await Promise.all([
    db.teacherClassRecord.findMany({
      where: { teacherId },
      select: { id: true, date: true, classNumber: true, amountMinor: true, paid: true, batch: { select: { name: true } }, subject: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { id: "asc" }],
    }),
    db.anonymousQuestion.findMany({
      where: { replies: { some: { userId: teacherId } } },
      select: {
        topic: true,
        hidden: true,
        replies: {
          orderBy: [...firstAnswerOrder],
          take: 1,
          select: { id: true, userId: true, teacherPaid: true, createdAt: true },
        },
      },
    }),
  ]);
  const classItems = classes.map((item) => ({
    id: item.id, kind: "class" as const, date: item.date, paid: item.paid,
    title: `Class ${item.classNumber} · ${item.subject.name} · ${item.batch.name}`,
    amountMinor: item.amountMinor,
  }));
  const answerItems = questions.flatMap(({ topic, hidden, replies: [reply] }) =>
    reply?.userId === teacherId ? [{
      id: reply.id, kind: "qna" as const, date: dhakaDate(reply.createdAt), paid: reply.teacherPaid,
      title: hidden ? "Moderated Q&A" : topic,
      amountMinor: answerRate,
    }] : [],
  );
  const items = [...classItems, ...answerItems].sort((a, b) => b.date.localeCompare(a.date));
  const classTotalMinor = classItems.reduce((sum, item) => sum + item.amountMinor, 0);
  const totalMinor = classTotalMinor + answerItems.length * answerRate;
  const paidMinor = items.reduce((sum, item) => sum + (item.paid ? item.amountMinor : 0), 0);
  return {
    items, totalMinor, paidMinor, dueMinor: totalMinor - paidMinor,
    classCount: classItems.length, answerCount: answerItems.length, classTotalMinor, answerRate,
  };
}

export async function updateTeacherPayment(actor: Actor, body: unknown) {
  check(actor.role === "ADMIN");
  const { id, kind, paid } = z.object({
    id: z.string().min(1).max(500),
    kind: z.enum(["class", "qna"]),
    paid: z.boolean(),
  }).strict().parse(body);
  await db.$transaction(async (tx) => {
    if (kind === "class") {
      await tx.teacherClassRecord.update({ where: { id }, data: { paid } });
    } else {
      const reply = await tx.questionReply.findUniqueOrThrow({
        where: { id },
        select: { questionId: true, user: { select: { role: true } } },
      });
      const first = await tx.questionReply.findFirst({
        where: { questionId: reply.questionId },
        orderBy: [...firstAnswerOrder],
        select: { id: true },
      });
      check(reply.user.role === "TEACHER" && first?.id === id, 400, "Choose the credited teacher answer");
      await tx.questionReply.update({ where: { id }, data: { teacherPaid: paid } });
    }
    await tx.auditLog.create({
      data: { actorId: actor.id, resource: id, action: paid ? "teacherPayment.paid" : "teacherPayment.unpaid" },
    });
  });
  return { saved: true };
}
