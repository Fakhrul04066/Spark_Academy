import { Prisma } from "@prisma/client";
import { z } from "zod";
import { academicAccess, type Actor } from "@/lib/auth";
import { db } from "@/lib/db";
import { anonymousQuestion, dhakaDate } from "@/lib/domain";
import { check } from "@/lib/security";

const MONTHLY_LIMIT = 30;
const PAGE_SIZE = 20;

async function activeBatches(userId: string, now: Date, tx: Prisma.TransactionClient = db) {
  const grants = await tx.qaAccess.findMany({
    where: {
      userId, expiresAt: { gt: now },
      OR: [
        { kind: "QNA_ONLY" },
        { kind: "PAID_STUDENT", batch: { enrollments: { some: { userId } } } },
      ],
    },
    select: { batchId: true },
  });
  return [...new Set(grants.map(({ batchId }) => batchId))];
}

function monthBounds(now: Date) {
  const [year, month] = dhakaDate(now).split("-").map(Number);
  return {
    gte: new Date(Date.UTC(year, month - 1, 1) - 6 * 3600_000),
    lt: new Date(Date.UTC(year, month, 1) - 6 * 3600_000),
  };
}

async function questionsUsed(userId: string, now: Date, tx: Prisma.TransactionClient = db) {
  const where = { userId, createdAt: monthBounds(now) };
  return tx.anonymousQuestion.count({ where });
}

async function reserveQaQuestion(tx: Prisma.TransactionClient, userId: string, batchId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
  const now = new Date();
  check((await activeBatches(userId, now, tx)).includes(batchId), 403, "Active Q&A access is required for this batch.");
  check(await questionsUsed(userId, now, tx) < MONTHLY_LIMIT, 429, "You have used all 30 questions for this month.");
  return now;
}

export async function createQaQuestion(
  userId: string,
  data: Omit<Prisma.AnonymousQuestionUncheckedCreateInput, "userId"> & { batchId: string },
  imageIds: string[] = [],
) {
  return db.$transaction(async (tx) => {
    const now = await reserveQaQuestion(tx, userId, data.batchId);
    if (data.qaChapterId) check(await tx.chapter.findFirst({
      where: { id: data.qaChapterId, subjectId: data.subjectId }, select: { id: true },
    }), 400, "Select a chapter for this subject.");
    const images = data.imageId ? [data.imageId, ...imageIds] : imageIds;
    check(images.length <= 4 && new Set(images).size === images.length, 400, "Choose up to four different images.");
    if (images.length) {
      const available = await tx.audioAttachment.count({ where: {
        id: { in: images }, ownerId: userId, mime: { startsWith: "image/" },
        question: null, reply: null, imageQuestion: null, qaImage: null,
      } });
      check(available === images.length, 400, "An image is unavailable or already attached.");
    }
    const [imageId, ...extraImages] = images;
    return tx.anonymousQuestion.create({ data: {
      ...data, imageId, userId, createdAt: now,
      qaImages: { createMany: { data: extraImages.map((attachmentId, position) => ({ attachmentId, position })) } },
    } });
  });
}

const classQuestions = (batchIds: string[]): Prisma.AnonymousQuestionWhereInput => ({
  batchId: { in: batchIds },
  shareWithClass: true,
  OR: [{ shareWhilePending: true }, { replies: { some: {} } }],
});

export async function checkQaMedia(u: Actor, question: {
  id: string; batchId: string; subjectId: string; userId: string; hidden: boolean;
}) {
  check(!question.hidden);
  if (u.role !== "STUDENT") {
    await academicAccess(u, question.batchId, question.subjectId);
    return;
  }
  if (question.userId === u.id) return;
  const batches = await activeBatches(u.id, new Date());
  check(await db.anonymousQuestion.findFirst({
    where: { id: question.id, hidden: false, ...classQuestions(batches) },
    select: { id: true },
  }));
}

export async function readQa(u: Actor, query: URLSearchParams) {
  check(u.role === "STUDENT" || u.role === "TEACHER");
  const student = u.role === "STUDENT";
  const now = new Date();
  const batchIds = student ? await activeBatches(u.id, now) : [];
  const assignments = await db.teacherAssignment.findMany({
    where: student ? { batchId: { in: batchIds } } : { userId: u.id },
    select: { batchId: true, subjectId: true, batch: { select: { name: true, className: true } }, subject: { select: { name: true, chapters: { orderBy: { name: "asc" }, select: { id: true, name: true } } } } },
    distinct: ["batchId", "subjectId"],
  });
  const own = { userId: u.id };
  const visible: Prisma.AnonymousQuestionWhereInput = student
    ? { OR: [own, classQuestions(batchIds)] }
    : { OR: assignments.map(({ batchId, subjectId }) => ({ batchId, subjectId })) };
  const base: Prisma.AnonymousQuestionWhereInput = { hidden: false, AND: [visible] };
  const answered = { replies: { some: {} } };
  const pending = { replies: { none: {} } };
  const bookmarked = { bookmarks: { some: { userId: u.id } } };
  const tab = query.get("tab");
  const subject = query.get("subject");
  const term = query.get("q")?.trim().slice(0, 100);
  const page = Math.max(1, Math.min(500, Math.trunc(Number(query.get("page")) || 1)));
  const where: Prisma.AnonymousQuestionWhereInput = { AND: [
    base,
    student && tab === "mine" ? own : {},
    student && tab === "saved" ? bookmarked : {},
    !student && tab === "queue" ? pending : {},
    subject ? { subjectId: subject } : {},
    term ? { OR: [
      { topic: { contains: term, mode: "insensitive" } },
      { text: { contains: term, mode: "insensitive" } },
      { subject: { name: { contains: term, mode: "insensitive" } } },
      { qaChapter: { name: { contains: term, mode: "insensitive" } } },
      { replies: { some: { text: { contains: term, mode: "insensitive" } } } },
    ] } : {},
  ] };
  const stats = student ? { ...base, ...own } : base;
  const month = monthBounds(now);
  const [rows, answeredCount, pendingCount, savedCount, used] = await Promise.all([
    db.anonymousQuestion.findMany({
      where, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        batch: { select: { className: true } },
        subject: { select: { name: true } },
        qaChapter: { select: { name: true } },
        qaImages: { orderBy: { position: "asc" }, select: { attachmentId: true } },
        qaSignals: { where: { userId: u.id }, select: { sameDoubt: true, understood: true } },
        _count: { select: { qaDiscussionComments: true, qaSignals: { where: { sameDoubt: true } } } },
        replies: { orderBy: { createdAt: "asc" } },
        bookmarks: { where: { userId: u.id }, select: { userId: true } },
      },
    }),
    db.anonymousQuestion.count({ where: { AND: [stats, answered] } }),
    db.anonymousQuestion.count({ where: { AND: [stats, pending] } }),
    student ? db.anonymousQuestion.count({ where: { AND: [base, bookmarked] } }) : 0,
    student ? questionsUsed(u.id, now) : 0,
  ]);
  return {
    assignments,
    active: student && batchIds.length > 0,
    remaining: Math.max(0, MONTHLY_LIMIT - used),
    used,
    limit: MONTHLY_LIMIT,
    resetsOn: dhakaDate(month.lt),
    answeredCount, pendingCount, savedCount,
    hasMore: rows.length > PAGE_SIZE,
    items: rows.slice(0, PAGE_SIZE).map((row) => ({
      ...anonymousQuestion(row), className: row.batch.className, subject: row.subject.name, mine: row.userId === u.id,
      saved: row.bookmarks.length > 0,
      chapter: row.qaChapter?.name,
      images: [row.imageId, ...row.qaImages.map(({ attachmentId }) => attachmentId)].filter((id): id is string => !!id),
      commentCount: row._count.qaDiscussionComments,
      sameDoubtCount: row._count.qaSignals,
      sameDoubt: row.qaSignals[0]?.sameDoubt ?? false,
      understood: row.qaSignals[0]?.understood ?? false,
    })),
  };
}

export async function saveQa(u: Actor, body: unknown) {
  check(u.role === "STUDENT");
  const { questionId, saved } = z.object({ questionId: z.string().min(1).max(500), saved: z.boolean() }).strict().parse(body);
  if (!saved) {
    await db.qaBookmark.deleteMany({ where: { userId: u.id, questionId } });
    return;
  }
  const batches = await activeBatches(u.id, new Date());
  check(await db.anonymousQuestion.findFirst({
    where: { id: questionId, hidden: false, OR: [{ userId: u.id }, classQuestions(batches)] },
    select: { id: true },
  }));
  await db.qaBookmark.upsert({
    where: { userId_questionId: { userId: u.id, questionId } },
    create: { userId: u.id, questionId }, update: {},
  });
}

export async function manageQaAccess(u: Actor, body: unknown) {
  check(u.role === "ADMIN");
  const { email, batchId, kind, expiresOn } = z.object({
    email: z.email(), batchId: z.string().min(1).max(500),
    kind: z.enum(["PAID_STUDENT", "QNA_ONLY"]),
    expiresOn: z.iso.date().nullable(),
  }).strict().parse(body);
  const student = await db.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" }, role: "STUDENT" },
    select: { id: true },
  });
  check(student, 404, "Student account not found.");
  const key = { userId: student.id, batchId, kind };
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${student.id} FOR UPDATE`;
    if (expiresOn === null) {
      await tx.qaAccess.deleteMany({ where: key });
    } else {
      const expiresAt = new Date(Date.parse(expiresOn + "T00:00:00+06:00") + 86_400_000);
      check(expiresAt > new Date(), 400, "Choose today or a future date.");
      if (kind === "PAID_STUDENT") check(await tx.enrollment.findUnique({
        where: { userId_batchId: { userId: student.id, batchId } },
      }), 400, "The student must be enrolled in this batch.");
      await tx.qaAccess.upsert({
        where: { userId_batchId_kind: key }, create: { ...key, expiresAt }, update: { expiresAt },
      });
    }
    await tx.auditLog.create({ data: {
      actorId: u.id, action: expiresOn === null ? "qa-access.revoke" : "qa-access.grant",
      resource: [student.id, batchId, kind].join(":"),
    } });
  });
}


export async function updateQaSignal(u: Actor, body: unknown) {
  check(u.role === "STUDENT");
  const { questionId, action, value } = z.object({
    questionId: z.string().min(1).max(500),
    action: z.enum(["sameDoubt", "understood"]),
    value: z.boolean(),
  }).strict().parse(body);
  const batches = await activeBatches(u.id, new Date());
  const question = await db.anonymousQuestion.findFirst({ where: {
    id: questionId, hidden: false, OR: [{ userId: u.id }, classQuestions(batches)],
    ...(action === "understood" ? { replies: { some: {} } } : { userId: { not: u.id } }),
  }, select: { id: true } });
  check(question);
  const key = { userId: u.id, questionId };
  await db.qaQuestionSignal.upsert({
    where: { userId_questionId: key },
    create: { ...key, [action]: value },
    update: { [action]: value },
  });
}


async function discussionQuestion(u: Actor, questionId: string) {
  check(u.role === "STUDENT" || u.role === "TEACHER");
  const question = await db.anonymousQuestion.findFirst({
    where: { id: questionId, hidden: false, replies: { some: {} } },
    select: { id: true, batchId: true, subjectId: true, userId: true, hidden: true },
  });
  check(question, 404, "Answered question not found.");
  await checkQaMedia(u, question);
  return question;
}

export async function readQaDiscussion(u: Actor, questionId: string, query: URLSearchParams) {
  await discussionQuestion(u, questionId);
  const page = Math.max(1, Math.min(500, Math.trunc(Number(query.get("page")) || 1)));
  const paging = { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE + 1 };
  const rows = await db.qaDiscussionComment.findMany({
    where: { questionId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, userId: true, user: { select: { role: true } }, text: true, createdAt: true },
    ...paging,
  });
  return {
    items: rows.slice(0, PAGE_SIZE).map((row) => ({
      id: row.id, text: row.text, createdAt: row.createdAt,
      author: row.userId === u.id ? "You" : row.user.role === "TEACHER" ? "Teacher" : "Anonymous student",
    })),
    hasMore: rows.length > PAGE_SIZE,
  };
}

export async function writeQaDiscussion(u: Actor, body: unknown) {
  const { questionId, text } = z.object({
    questionId: z.string().min(1).max(500),
    text: z.string().trim().min(1).max(2000),
  }).strict().parse(body);
  const question = await discussionQuestion(u, questionId);
  if (u.role === "STUDENT")
    check((await activeBatches(u.id, new Date())).includes(question.batchId), 403, "Active Q&A access is required to comment.");
  await db.qaDiscussionComment.create({ data: { questionId, userId: u.id, text } });
}
