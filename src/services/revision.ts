import { db } from "@/lib/db";
import { dhakaDate, revisionDates, scoreExam } from "@/lib/domain";
import { sendEmail, syncSheet } from "@/lib/integrations";
export async function runJobs() {
  const today = dhakaDate();
  const stale = new Date(Date.now() - 15 * 60 * 1000);
  const expired = await db.examAttempt.findMany({
    where: { submittedAt: null, deadline: { lte: new Date() } },
    include: { exam: { include: { questions: true } }, answers: true },
    take: 1000,
  });
  for (const a of expired)
    await db.examAttempt.updateMany({
      where: { id: a.id, submittedAt: null },
      data: {
        ...scoreExam(a.exam.questions, a.answers),
        submittedAt: a.deadline,
      },
    });
  const released = await db.examAttempt.findMany({
    where: {
      submittedAt: { not: null },
      exam: { releaseAt: { lte: new Date() } },
      user: { active: true },
    },
    select: { examId: true, userId: true, exam: { select: { title: true } } },
    distinct: ["examId", "userId"],
  });
  for (const a of released)
    await db.notification.upsert({
      where: { dedupeKey: `result:${a.examId}:${a.userId}` },
      create: {
        dedupeKey: `result:${a.examId}:${a.userId}`,
        userId: a.userId,
        title: "Result published",
        message: `Your result for ${a.exam.title} is available.`,
        path: "/student/results",
      },
      update: {},
    });
  const due = await db.revisionSchedule.findMany({
    where: {
      dueDate: { lte: today },
      cancelled: false,
      completedAt: null,
      topic: { user: { active: true } },
    },
    include: { topic: { include: { user: true } } },
  });
  let delivered = 0,
    previews = 0,
    failed = 0,
    synced = 0;
  for (const s of due) {
    await db.notification.upsert({
      where: { dedupeKey: `revision:${s.id}` },
      create: {
        dedupeKey: `revision:${s.id}`,
        userId: s.topic.userId,
        title: "Revision reminder",
        message: `${s.topic.name} is due for revision.`,
        path: "/student/revision",
      },
      update: {},
    });
    if (!s.topic.user.emailReminders) continue;
    await db.revisionReminderLog.upsert({
      where: { scheduleId: s.id },
      create: { scheduleId: s.id },
      update: {},
    });
    const claim = await db.revisionReminderLog.updateMany({
      where: {
        scheduleId: s.id,
        OR: [
          { status: { in: ["PENDING", "FAILED"] } },
          { status: "PROCESSING", lockedAt: { lt: stale } },
        ],
        attempts: { lt: 8 },
      },
      data: {
        status: "PROCESSING",
        lockedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (!claim.count) continue;
    try {
      const fresh = await db.revisionSchedule.findUnique({
        where: { id: s.id },
        include: { topic: { include: { user: true } } },
      });
      if (
        !fresh ||
        fresh.cancelled ||
        fresh.completedAt ||
        !fresh.topic.user.active ||
        !fresh.topic.user.emailReminders
      ) {
        await db.revisionReminderLog.update({
          where: { scheduleId: s.id },
          data: { status: "CANCELLED" },
        });
        continue;
      }
      const result = await sendEmail(
        s.topic.user.email,
        "Spark Academy Revision Reminder",
        `Your topic ${s.topic.name} is due for revision (scheduled ${s.dueDate}). Open ${process.env.NEXTAUTH_URL}/student/revision to complete your revision.`,
        `revision-${s.id}`,
      );
      await db.revisionReminderLog.update({
        where: { scheduleId: s.id },
        data: {
          status: result,
          sentAt: result === "SENT" ? new Date() : null,
          error: null,
        },
      });
      if (result === "SENT") delivered++;
      else previews++;
    } catch (e) {
      failed++;
      await db.revisionReminderLog.update({
        where: { scheduleId: s.id },
        data: {
          status: "FAILED",
          error: e instanceof Error ? e.message : "Delivery failed",
        },
      });
    }
  }
  const jobs = await db.googleSheetSyncJob.findMany({
    where: {
      OR: [
        { status: { in: ["PENDING", "FAILED"] } },
        { status: "PROCESSING", lockedAt: { lt: stale } },
      ],
      attempts: { lt: 8 },
    },
    take: 100,
  });
  for (const j of jobs) {
    const claim = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${j.topicId}))::text`;
      const other = await tx.googleSheetSyncJob.findFirst({
        where: {
          topicId: j.topicId,
          id: { not: j.id },
          status: "PROCESSING",
          lockedAt: { gte: stale },
        },
      });
      if (other) return { count: 0 };
      return tx.googleSheetSyncJob.updateMany({
        where: {
          id: j.id,
          OR: [
            { status: { in: ["PENDING", "FAILED"] } },
            { status: "PROCESSING", lockedAt: { lt: stale } },
          ],
        },
        data: {
          status: "PROCESSING",
          lockedAt: new Date(),
          attempts: { increment: 1 },
        },
      });
    });
    if (!claim.count) continue;
    try {
      const t = await db.revisionTopic.findUniqueOrThrow({
        where: { id: j.topicId },
        include: { chapter: { include: { subject: true } }, schedules: true },
      });
      await syncSheet([
        t.id,
        t.userId,
        t.chapter.subject.name,
        t.chapter.name,
        t.name,
        t.learningDate,
        t.status,
        t.schedules
          .filter((s) => !s.cancelled)
          .map((s) => s.dueDate)
          .join(", "),
        t.schedules
          .filter((s) => s.completedAt)
          .map((s) => s.dueDate)
          .join(", "),
      ]);
      await db.googleSheetSyncJob.update({
        where: { id: j.id },
        data: { status: "SYNCED", error: null },
      });
      synced++;
    } catch (e) {
      failed++;
      await db.googleSheetSyncJob.update({
        where: { id: j.id },
        data: {
          status: "FAILED",
          error: e instanceof Error ? e.message : "Sync failed",
        },
      });
    }
  }
  return { date: today, delivered, previews, synced, failed };
}
export { revisionDates };
