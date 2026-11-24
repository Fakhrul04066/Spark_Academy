import { checkQaStaffAccess, createQaQuestion } from "./qa-access";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { BLOOD_GROUPS } from "@/lib/profile";
import { readBilling, recordFee, recordPayment } from "./billing";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { academicAccess, batchIds, type Actor } from "@/lib/auth";
import { check, audit, HttpError } from "@/lib/security";
import {
  anonymousQuestion,
  dhakaDate,
  percentage,
  rank,
  revisionDates,
  revisionProgress,
  scoreExam,
  safeUrl,
  youtubeUrl,
} from "@/lib/domain";
const str = z.string().trim().min(1).max(500),
  id = str;
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === s;
  }, "Invalid date");
const date = z.iso.datetime({ offset: true });
const videoLink = z
  .string()
  .refine((v) => {
    try {
      youtubeUrl(v);
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid supported YouTube video URL")
  .transform(youtubeUrl);
const resourceLink = z
  .string()
  .refine((v) => {
    try {
      safeUrl(v);
      return true;
    } catch {
      return false;
    }
  }, "Enter a secure public HTTPS resource URL")
  .transform(safeUrl);
const fields = {
  batches: z.object({ name: str, className: str }).strict(),
  subjects: z.object({ name: str }).strict(),
  chapters: z.object({ name: str, subjectId: id }).strict(),
  enrollments: z.object({ userId: id, batchId: id }).strict(),
  assignments: z.object({ userId: id, batchId: id, subjectId: id }).strict(),
  lessons: z
    .object({
      title: str,
      description: z.string().max(3000),
      youtubeUrl: videoLink,
      chapterId: id,
      batchId: id,
      order: z.number().int().min(0).default(0),
    })
    .strict(),
  resources: z
    .object({
      title: str,
      type: z.enum(["PDF", "Slides", "Drive", "Website", "Notes"]),
      url: resourceLink,
      chapterId: id,
      batchId: id,
    })
    .strict(),
  routines: z
    .object({
      batchId: id,
      teacherId: id,
      subject: str,
      location: str,
      startsAt: date,
      endsAt: date,
    })
    .strict(),
  questions: z
    .object({
      batchId: id,
      subjectId: id,
      topic: str,
      text: z.string().max(10000),
      audioId: id.optional(),
      imageId: id.optional(),
      shareWithClass: z.boolean().optional(),
      shareWhilePending: z.boolean().optional(),
      qaChapterId: id.optional(),
      imageIds: z.array(id).max(4).optional(),
    })
    .strict(),
  feedback: z
    .object({
      teacherId: id,
      category: z.enum([
        "Teaching Quality",
        "Class Explanation",
        "Communication",
        "Academic Support",
        "Complaint",
        "Suggestion",
        "Other",
      ]),
      subject: str,
      message: z.string().min(5).max(10000),
    })
    .strict(),
  revision: z
    .object({
      chapterId: id,
      name: str,
      learningDate: day,
      status: z.enum(["RED", "YELLOW", "GREEN"]),
    })
    .strict(),
};
export async function academicWhere(u: Actor) {
  if (u.role === "ADMIN") return {};
  if (u.role === "STUDENT") return { batchId: { in: await batchIds(u) } };
  const assignments = await db.teacherAssignment.findMany({
    where: { userId: u.id },
  });
  return {
    OR: assignments.map((a) => ({
      batchId: a.batchId,
      chapter: { subjectId: a.subjectId },
    })),
  };
}
export async function getData(
  u: Actor,
  resource: string,
  params: URLSearchParams,
) {
  const ids = await batchIds(u);
  const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .default(1)
      .parse(params.get("page") ?? undefined),
    take = 20,
    skip = (page - 1) * take;
  const q = (params.get("q") || "").slice(0, 100);
  const academic = await academicWhere(u);
  switch (resource) {
    case "billing":
      return readBilling(u, params.get("studentId"));
    case "catalog": {
      const subjects = await db.subject.findMany({
        where:
          u.role === "TEACHER"
            ? { assignments: { some: { userId: u.id } } }
            : u.role === "STUDENT"
              ? {
                  OR: [
                    {
                      chapters: {
                        some: { lessons: { some: { batchId: { in: ids } } } },
                      },
                    },
                    { assignments: { some: { batchId: { in: ids } } } },
                  ],
                }
              : {},
        include: { chapters: true },
      });
      const batches = await db.batch.findMany({ where: { id: { in: ids } } });
      const teachers = await db.user.findMany({
        where: {
          role: "TEACHER",
          active: true,
          ...(u.role === "ADMIN"
            ? {}
            : { assignments: { some: { batchId: { in: ids } } } }),
        },
        select: { id: true, name: true },
      });
      const students =
        u.role === "ADMIN"
          ? await db.user.findMany({
              where: { role: "STUDENT", active: true },
              select: { id: true, name: true },
              take: 1000,
            })
          : [];
      return { subjects, batches, teachers, students };
    }
    case "profile": {
      const profile = await db.user.findUnique({
        where: { id: u.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          school: true,
          bloodGroup: true,
          studentCode: true,
          className: true,
          group: true,
          guardianName: true,
          guardianContact: true,
          createdAt: true,
          emailReminders: true,
          role: true,
          avatarKey: true,
          enrollments: { include: { batch: true } },
        },
      });
      if (!profile) return null;
      const { avatarKey, ...safe } = profile;
      return { ...safe, hasAvatar: !!avatarKey };
    }
    case "students":
    case "teachers": {
      check(u.role !== "STUDENT");
      const role = resource === "students" ? "STUDENT" : "TEACHER";
      check(u.role === "ADMIN" || role === "STUDENT");
      const batch = params.get("batchId");
      if (batch) await academicAccess(u, batch);
      return db.user.findMany({
        where: {
          role,
          name: { contains: q, mode: "insensitive" },
          ...(batch
            ? { enrollments: { some: { batchId: batch } } }
            : u.role === "TEACHER"
              ? { enrollments: { some: { batchId: { in: ids } } } }
              : {}),
        },
        select:
          u.role === "ADMIN"
            ? {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                studentCode: true,
                className: true,
                group: true,
                phone: true,
                school: true,
                guardianName: true,
                guardianContact: true,
                createdAt: true,
              }
            : { id: true, name: true, studentCode: true },
        skip: batch ? 0 : skip,
        take: batch ? 1000 : take,
        orderBy: { name: "asc" },
      });
    }
    case "batches":
      return db.batch.findMany({
        where: { id: { in: ids }, name: { contains: q, mode: "insensitive" } },
        skip,
        take,
      });
    case "subjects":
      return db.subject.findMany({
        where:
          u.role === "ADMIN"
            ? { name: { contains: q, mode: "insensitive" } }
            : {
                assignments: {
                  some: {
                    batchId: { in: ids },
                    ...(u.role === "TEACHER" ? { userId: u.id } : {}),
                  },
                },
              },
        skip,
        take,
      });
    case "chapters":
      return db.chapter.findMany({
        where:
          u.role === "ADMIN"
            ? {}
            : {
                subject: {
                  assignments: {
                    some: {
                      batchId: { in: ids },
                      ...(u.role === "TEACHER" ? { userId: u.id } : {}),
                    },
                  },
                },
              },
        include: { subject: true },
        skip,
        take,
      });
    case "enrollments":
      check(u.role === "ADMIN");
      return db.enrollment.findMany({
        include: { user: { select: { name: true } }, batch: true },
        skip,
        take,
      });
    case "assignments":
      check(u.role === "ADMIN");
      return db.teacherAssignment.findMany({
        include: {
          user: { select: { name: true } },
          batch: true,
          subject: true,
        },
        skip,
        take,
      });
    case "lessons":
      return db.lesson.findMany({
        where: { ...academic, title: { contains: q, mode: "insensitive" } },
        include: {
          chapter: { include: { subject: true } },
          progress: { where: { userId: u.id }, select: { completedAt: true } },
        },
        orderBy: { order: "asc" },
        skip,
        take,
      });
    case "resources":
      return db.learningResource.findMany({
        where: { ...academic, title: { contains: q, mode: "insensitive" } },
        include: { chapter: { include: { subject: true } } },
        skip,
        take,
      });
    case "routines": {
      const selectedDay = params.get("date") ? day.parse(params.get("date")) : null;
      const startsAt = selectedDay ? new Date(selectedDay + "T00:00:00+06:00") : null;
      return db.classRoutine.findMany({
        where: {
          batchId: { in: ids },
          ...(u.role === "TEACHER" ? { teacherId: u.id } : {}),
          ...(startsAt ? {
            startsAt: { lt: new Date(+startsAt + 86_400_000) },
            endsAt: { gt: startsAt },
          } : {}),
        },
        orderBy: { startsAt: "asc" },
        skip,
        take,
      });
    }
    case "exams":
      return db.exam.findMany({
        where: {
          ...academic,
          ...(u.role === "STUDENT" ? { published: true } : {}),
          ...(params.get("open") === "true" ? { published: true, endsAt: { gte: new Date() } } : {}),
          title: { contains: q, mode: "insensitive" },
        },
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          attemptLimit: true,
          published: true,
          startsAt: true,
          endsAt: true,
          releaseAt: true,
          batchId: true,
          chapterId: true,
          chapter: { include: { subject: true } },
          _count: { select: { questions: true } },
        },
        skip,
        take,
      });
    case "exam-attempts":
      return db.examAttempt.findMany({
        where: { userId: u.id, submittedAt: null },
        select: { id: true, examId: true, deadline: true },
        take,
      });
    case "results": {
      const attempts = await db.examAttempt.findMany({
        where: {
          submittedAt: { not: null },
          exam: { ...academic, releaseAt: { lte: new Date() } },
        },
        include: {
          exam: {
            select: {
              title: true,
              releaseAt: true,
              chapter: { include: { subject: true } },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });
      const best = new Map<string, number>();
      for (const a of attempts) {
        const key = a.examId + ":" + a.userId;
        best.set(key, Math.max(best.get(key) ?? -1, a.score ?? 0));
      }
      return attempts
        .filter((a) => u.role !== "STUDENT" || a.userId === u.id)
        .slice(skip, skip + take)
        .map((a) => ({
          id: a.id,
          examId: a.examId,
          title: a.exam.title,
          subject: a.exam.chapter.subject.name,
          score: a.score,
          total: a.total,
          correct: a.correct,
          percentage: percentage(a.score ?? 0, a.total ?? 0),
          position: rank(
            [...best.entries()]
              .filter(([k]) => k.startsWith(a.examId + ":"))
              .map(([, v]) => v),
            best.get(a.examId + ":" + a.userId) ?? 0,
          ),
          startedAt: a.startedAt,
          submittedAt: a.submittedAt,
          student:
            u.role === "STUDENT" ? "You" : `Learner ${a.userId.slice(-5)}`,
        }));
    }
    case "attendance": {
      const batch = params.get("batchId"),
        student = params.get("studentId");
      if (batch) await academicAccess(u, batch);
      return db.attendanceSession.findMany({
        where: {
          batchId: batch ? batch : { in: ids },
          ...(params.get("date") ? { date: params.get("date")! } : {}),
          ...(student && u.role === "ADMIN"
            ? { records: { some: { userId: student } } }
            : {}),
        },
        include: {
          batch: true,
          records: {
            where:
              u.role === "STUDENT"
                ? { userId: u.id }
                : student && u.role === "ADMIN"
                  ? { userId: student }
                  : {},
            select: {
              id: true,
              userId: true,
              present: true,
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { date: "desc" },
        skip,
        take,
      });
    }
    case "progress": {
      const lessons = await db.lesson.findMany({
        where: academic,
        include: {
          chapter: { include: { subject: true } },
          progress: { where: { userId: u.id } },
        },
      });
      const released = await db.examAttempt.findMany({
        where: {
          ...(u.role === "STUDENT" ? { userId: u.id } : {}),
          exam: { ...academic, releaseAt: { lte: new Date() } },
          submittedAt: { not: null },
        },
        include: {
          exam: { include: { chapter: { include: { subject: true } } } },
        },
        orderBy: { submittedAt: "desc" },
      });
      const subjects = [
        ...new Set([
          ...lessons.map((l) => l.chapter.subject.name),
          ...released.map((a) => a.exam.chapter.subject.name),
        ]),
      ];
      return subjects.map((subject) => {
        const list = lessons.filter((l) => l.chapter.subject.name === subject),
          scores = released.filter(
            (a) => a.exam.chapter.subject.name === subject,
          );
        const latest = new Map<string, number>();
        for (const a of scores)
          if (!latest.has(a.exam.chapterId))
            latest.set(
              a.exam.chapterId,
              percentage(a.score ?? 0, a.total ?? 0),
            );
        const average = scores.length
          ? Math.round(
              scores.reduce(
                (s, a) => s + percentage(a.score ?? 0, a.total ?? 0),
                0,
              ) / scores.length,
            )
          : null;
        return {
          subject,
          completed: list.filter((l) => l.progress.length).length,
          total: list.length,
          percentage:
            u.role === "STUDENT"
              ? percentage(
                  list.filter((l) => l.progress.length).length,
                  list.length,
                )
              : (average ?? 0),
          averageScore: average,
          weakTopics: [...latest]
            .filter(([, score]) => score < 60)
            .map(
              ([id]) =>
                scores.find((a) => a.exam.chapterId === id)!.exam.chapter.name,
            ),
          chapters: [...new Set(list.map((l) => l.chapterId))].length,
          completedChapters: [...new Set(list.map((l) => l.chapterId))].filter(
            (id) =>
              list
                .filter((l) => l.chapterId === id)
                .every((l) => l.progress.length),
          ).length,
        };
      });
    }
    case "questions": {
      const rows = await db.anonymousQuestion.findMany({
        where:
          u.role === "ADMIN"
            ? {}
            : u.role === "STUDENT"
              ? { userId: u.id, hidden: false }
              : {
                  hidden: false,
                  publishedToTeachersAt: { not: null },
                },
        include: { replies: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });
      return rows.map((row) =>
        u.role === "ADMIN"
          ? {
              ...anonymousQuestion(row),
              studentId: row.userId,
              replyAuthorIds: row.replies.map((r) => r.userId),
              hidden: row.hidden,
            }
          : anonymousQuestion(row),
      );
    }
    case "feedback":
      check(u.role !== "TEACHER");
      return db.teacherFeedback.findMany({
        where: u.role === "ADMIN" ? {} : { studentId: u.id },
        include: {
          teacher: { select: { name: true } },
          replies: { select: { id: true, text: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });
    case "revision":
      check(u.role === "STUDENT");
      return db.revisionTopic.findMany({
        where: { userId: u.id, name: { contains: q, mode: "insensitive" } },
        include: {
          chapter: { include: { subject: true } },
          schedules: { orderBy: { dueDate: "asc" } },
        },
        skip,
        take,
      });
    case "revision-schedules":
      return db.revisionSchedule.findMany({
        where: {
          topic:
            u.role === "STUDENT"
              ? { userId: u.id }
              : u.role === "ADMIN"
                ? {}
                : { userId: "FORBIDDEN" },
          cancelled: false,
        },
        include: { topic: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        skip,
        take,
      });
    case "notifications":
      return db.notification.findMany({
        where: { userId: u.id },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });
    case "reports":
      check(u.role === "ADMIN");
      return {
        students: await db.user.count({ where: { role: "STUDENT" } }),
        teachers: await db.user.count({ where: { role: "TEACHER" } }),
        batches: await db.batch.count(),
        exams: await db.exam.count({ where: { published: true } }),
        questions: await db.anonymousQuestion.count({
          where: { replies: { none: {} } },
        }),
        feedback: await db.teacherFeedback.count({
          where: { status: { not: "RESOLVED" } },
        }),
        audit: await db.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        email: await db.revisionReminderLog.groupBy({
          by: ["status"],
          _count: true,
        }),
        sheets: await db.googleSheetSyncJob.groupBy({
          by: ["status"],
          _count: true,
        }),
      };
    case "dashboard": {
      const attendance = await db.attendanceRecord.findMany({
        where:
          u.role === "STUDENT"
            ? { userId: u.id }
            : { session: { batchId: { in: ids } } },
      });
      const lessons = await db.lesson.findMany({
        where: academic,
        select: { progress: { where: { userId: u.id }, select: { id: true } } },
      });
      const results = await db.examAttempt.findMany({
        where: {
          ...(u.role === "STUDENT" ? { userId: u.id } : {}),
          exam: { ...academic, releaseAt: { lte: new Date() } },
          submittedAt: { not: null },
        },
        select: { score: true, total: true },
      });
      return {
        batches: ids.length,
        lessons: lessons.length,
        progress: percentage(
          lessons.filter((l) => l.progress.length).length,
          lessons.length,
        ),
        completedLessons: lessons.filter((l) => l.progress.length).length,
        attendanceSummary: {
          total: attendance.length,
          present: attendance.filter((a) => a.present).length,
          absent: attendance.filter((a) => !a.present).length,
        },
        resultCount: results.length,
        attendance: percentage(
          attendance.filter((a) => a.present).length,
          attendance.length,
        ),
        average: results.length
          ? Math.round(
              results.reduce(
                (s, a) => s + percentage(a.score ?? 0, a.total ?? 0),
                0,
              ) / results.length,
            )
          : 0,
        exams: await db.exam.count({
          where: { ...academic, published: true, endsAt: { gte: new Date() } },
        }),
        revisions: await db.revisionSchedule.count({
          where: {
            topic: { userId: u.id },
            completedAt: null,
            cancelled: false,
            dueDate: { lte: dhakaDate() },
          },
        }),
        unread: await db.notification.count({
          where: { userId: u.id, readAt: null },
        }),
        students:
          u.role === "ADMIN"
            ? await db.user.count({ where: { role: "STUDENT" } })
            : u.role === "TEACHER"
              ? await db.enrollment.count({ where: { batchId: { in: ids } } })
              : undefined,
      };
    }
    default:
      throw new HttpError(404, "Resource not found");
  }
}
async function notifyBatch(
  batchId: string,
  title: string,
  message: string,
  path: string,
) {
  const users = await db.enrollment.findMany({
    where: { batchId },
    select: { userId: true },
  });
  if (users.length)
    await db.notification.createMany({
      data: users.map((x) => ({ userId: x.userId, title, message, path })),
    });
}
export async function mutate(
  u: Actor,
  resource: string,
  method: string,
  body: unknown,
): Promise<{ id?: string; saved?: boolean }> {
  const methods: Record<string, string[]> = {
    "fee-charges": ["POST"],
    "fee-payments": ["POST"],
    profile: ["PATCH"],
    students: ["POST", "PATCH"],
    teachers: ["POST", "PATCH"],
    progress: ["POST"],
    attendance: ["POST"],
    revision: ["POST", "PATCH"],
    "revision-schedules": ["PATCH"],
    notifications: ["POST", "PATCH"],
    questions: ["POST", "PATCH"],
    "question-replies": ["POST"],
    feedback: ["POST", "PATCH"],
    exams: ["POST", "PATCH", "DELETE"],
    batches: ["POST", "PATCH", "DELETE"],
    subjects: ["POST", "PATCH", "DELETE"],
    chapters: ["POST", "PATCH", "DELETE"],
    enrollments: ["POST", "DELETE"],
    assignments: ["POST", "DELETE"],
    lessons: ["POST", "PATCH", "DELETE"],
    resources: ["POST", "PATCH", "DELETE"],
    routines: ["POST", "PATCH", "DELETE"],
  };
  check(
    methods[resource]?.includes(method),
    405,
    "Unsupported operation for this resource",
  );
  const raw = z.object({ id: id.optional() }).passthrough().parse(body);
  const target = raw.id;
  if (resource === "fee-charges") return recordFee(u, body);
  if (resource === "fee-payments") return recordPayment(u, body);
  if (resource === "profile") {
    const data = z
      .object({
        name: str,
        phone: z.string().max(30).optional(),
        school: z.string().max(200).optional(),
        bloodGroup: z.enum([...BLOOD_GROUPS, ""]).transform((value) => value || null).optional(),
        emailReminders: z.boolean().optional(),
      })
      .strict()
      .parse(body);
    await db.user.update({ where: { id: u.id }, data });
    return { saved: true };
  }
  if (resource === "students" || resource === "teachers") {
    check(u.role === "ADMIN");
    if (method === "PATCH") {
      const data = z
        .object({
          id,
          active: z.boolean().optional(),
          name: str.optional(),
          className: z.string().max(100).optional(),
          studentCode: z.string().max(100).optional(),
          group: z.string().max(100).optional(),
          phone: z.string().max(30).optional(),
          school: z.string().max(200).optional(),
          guardianName: z.string().max(200).optional(),
          guardianContact: z.string().max(100).optional(),
        })
        .strict()
        .parse(body);
      const { id: uid, ...rest } = data;
      const user = await db.user.findUniqueOrThrow({ where: { id: uid } });
      check(user.role === (resource === "students" ? "STUDENT" : "TEACHER"));
      await db.user.update({
        where: { id: uid },
        data: {
          ...rest,
          ...(data.active === false
            ? { sessionVersion: { increment: 1 } }
            : {}),
        },
      });
      await audit(u.id, "account.update", uid);
      return { saved: true };
    }
    check(
      method === "POST",
      405,
      "Deactivate accounts instead of deleting student history",
    );
    const data = z
      .object({
        name: str,
        email: z.email(),
        password: z.string().min(12).max(128),
        className: str.optional(),
        studentCode: str.optional(),
      })
      .strict()
      .parse(body);
    const { password, ...rest } = data;
    const created = await db.user.create({
      data: {
        ...rest,
        email: rest.email.toLowerCase(),
        role: resource === "students" ? "STUDENT" : "TEACHER",
        passwordHash: await hash(password, 12),
      },
      select: { id: true, name: true },
    });
    await audit(u.id, "account.create", created.id);
    return created;
  }
  if (resource === "progress") {
    check(u.role === "STUDENT");
    const data = z
      .object({ lessonId: id, completed: z.boolean() })
      .strict()
      .parse(body);
    const lesson = await db.lesson.findUniqueOrThrow({
      where: { id: data.lessonId },
      include: { chapter: true },
    });
    await academicAccess(u, lesson.batchId, lesson.chapter.subjectId);
    if (data.completed)
      await db.learningProgress.upsert({
        where: { userId_lessonId: { userId: u.id, lessonId: lesson.id } },
        create: { userId: u.id, lessonId: lesson.id },
        update: {},
      });
    else
      await db.learningProgress.deleteMany({
        where: { userId: u.id, lessonId: lesson.id },
      });
    return { saved: true };
  }
  if (resource === "attendance") {
    check(u.role !== "STUDENT");
    const data = z
      .object({
        batchId: id,
        date: day,
        records: z
          .array(z.object({ userId: id, present: z.boolean() }).strict())
          .max(1000),
      })
      .strict()
      .parse(body);
    await academicAccess(u, data.batchId);
    const students = await db.enrollment.findMany({
      where: { batchId: data.batchId },
      select: { userId: true },
    });
    check(
      data.records.every((r) => students.some((s) => s.userId === r.userId)),
      400,
      "Student is not enrolled",
    );
    check(
      new Set(data.records.map((r) => r.userId)).size === data.records.length,
      400,
      "Duplicate attendance record",
    );
    await db.$transaction(async (tx) => {
      const session = await tx.attendanceSession.upsert({
        where: { batchId_date: { batchId: data.batchId, date: data.date } },
        create: { batchId: data.batchId, date: data.date },
        update: {},
      });
      for (const r of data.records)
        await tx.attendanceRecord.upsert({
          where: {
            sessionId_userId: { sessionId: session.id, userId: r.userId },
          },
          create: { ...r, sessionId: session.id },
          update: { present: r.present },
        });
    });
    await audit(u.id, "attendance.save", data.batchId);
    return { saved: true };
  }
  if (resource === "revision-schedules") {
    check(u.role === "STUDENT");
    const data = z
      .object({ id, completed: z.boolean().default(true) })
      .strict()
      .parse(body);
    const schedule = await db.revisionSchedule.findUniqueOrThrow({
      where: { id: data.id },
      include: { topic: true },
    });
    check(schedule.topic.userId === u.id && !schedule.cancelled);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "RevisionTopic" WHERE id = ${schedule.topicId} FOR UPDATE`;
      await tx.revisionSchedule.update({
        where: { id: data.id },
        data: { completedAt: data.completed ? new Date() : null },
      });
      const schedules = await tx.revisionSchedule.findMany({
        where: { topicId: schedule.topicId },
      });
      await tx.revisionTopic.update({
        where: { id: schedule.topicId },
        data: {
          status: revisionProgress(schedules, schedule.topic.status),
        },
      });
      await tx.googleSheetSyncJob.upsert({
        where: {
          topicId_version: {
            topicId: schedule.topicId,
            version: schedule.topic.version,
          },
        },
        create: { topicId: schedule.topicId, version: schedule.topic.version },
        update: { status: "PENDING", attempts: 0 },
      });
    });
    return { saved: true };
  }
  if (resource === "revision") {
    check(u.role === "STUDENT");
    if (method === "PATCH") {
      const data = z
        .object({ id, status: z.enum(["RED", "YELLOW", "GREEN"]) })
        .strict()
        .parse(body);
      return db.$transaction(
        async (tx) => {
          const old = await tx.revisionTopic.findUniqueOrThrow({
            where: { id: data.id },
          });
          check(old.userId === u.id);
          if (old.status === data.status) return { saved: true };
          const version = old.version + 1;
          const date = dhakaDate();
          await tx.revisionSchedule.updateMany({
            where: { topicId: old.id, completedAt: null, cancelled: false },
            data: { cancelled: true },
          });
          await tx.revisionTopic.update({
            where: { id: old.id },
            data: { status: data.status, version },
          });
          await tx.revisionSchedule.createMany({
            data: revisionDates(date, data.status).map((d) => ({
              topicId: old.id,
              version,
              dueDate: d,
            })),
          });
          await tx.googleSheetSyncJob.create({
            data: { topicId: old.id, version },
          });
          return { saved: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }
    const data = fields.revision.parse(body);
    check(
      data.learningDate <= dhakaDate(),
      400,
      "Learning date cannot be in the future",
    );
    const chapter = await db.chapter.findUniqueOrThrow({
      where: { id: data.chapterId },
    });
    check(
      await db.teacherAssignment.findFirst({
        where: {
          batchId: { in: await batchIds(u) },
          subjectId: chapter.subjectId,
        },
      }),
    );
    return db.$transaction(async (tx) => {
      const topic = await tx.revisionTopic.create({
        data: { ...data, userId: u.id },
      });
      await tx.revisionSchedule.createMany({
        data: revisionDates(data.learningDate, data.status).map((dueDate) => ({
          topicId: topic.id,
          version: 1,
          dueDate,
        })),
      });
      await tx.googleSheetSyncJob.create({
        data: { topicId: topic.id, version: 1 },
      });
      return { id: topic.id };
    });
  }
  if (resource === "notifications") {
    if (method === "PATCH") {
      const data = z.object({ id: id.optional() }).strict().parse(body);
      await db.notification.updateMany({
        where: { userId: u.id, ...(data.id ? { id: data.id } : {}) },
        data: { readAt: new Date() },
      });
      return { saved: true };
    }
    check(u.role === "ADMIN");
    const data = z
      .object({ batchId: id, title: str, message: z.string().min(1).max(3000) })
      .strict()
      .parse(body);
    await notifyBatch(
      data.batchId,
      data.title,
      data.message,
      "/student/notifications",
    );
    await audit(u.id, "announcement.create", data.batchId);
    return { saved: true };
  }
  if (resource === "questions") {
    if (method === "PATCH") {
      const data = z
        .object({
          id,
          reported: z.boolean().optional(),
          hidden: z.boolean().optional(),
          shareWithClass: z.boolean().optional(),
          shareWhilePending: z.boolean().optional(),
          publishToTeachers: z.literal(true).optional(),
        })
        .strict()
        .parse(body);
      const q = await db.anonymousQuestion.findUniqueOrThrow({
        where: { id: data.id },
      });
      if (u.role !== "ADMIN") {
        check(data.hidden === undefined && data.publishToTeachers === undefined);
        if (u.role === "STUDENT") check(q.userId === u.id);
        else {
          check(!q.hidden);
          checkQaStaffAccess(u, q);
        }
      }
      if (data.publishToTeachers) {
        check(data.hidden === undefined && data.reported === undefined &&
          data.shareWithClass === undefined && data.shareWhilePending === undefined,
          400, "Publish the question separately from moderation changes.");
        await db.$transaction(async (tx) => {
          const published = await tx.anonymousQuestion.updateMany({
            where: { id: q.id, publishedToTeachersAt: null, hidden: false },
            data: { publishedToTeachersAt: new Date() },
          });
          if (published.count) {
            await tx.auditLog.create({
              data: { actorId: u.id, action: "question.publish", resource: q.id },
            });
          } else {
            check(await tx.anonymousQuestion.count({
              where: { id: q.id, hidden: false, publishedToTeachersAt: { not: null } },
            }), 400, "Restore this question before publishing.");
          }
        });
        return { saved: true };
      }
      if (data.shareWithClass !== undefined || data.shareWhilePending !== undefined) {
        check(u.role === "STUDENT" && q.userId === u.id);
        if (data.shareWhilePending)
          check(data.shareWithClass ?? q.shareWithClass, 400, "Enable class sharing to share while pending.");
      }
      await db.anonymousQuestion.update({
        where: { id: q.id },
        data: {
          reported: data.reported,
          shareWithClass: data.shareWithClass,
          shareWhilePending: data.shareWithClass === false ? false : data.shareWhilePending,
          ...(u.role === "ADMIN" ? { hidden: data.hidden } : {}),
        },
      });
      await audit(u.id, "question.moderate", q.id);
      return { saved: true };
    }
    check(u.role === "STUDENT");
    const { imageIds, ...data } = fields.questions.parse(body);
    if (data.shareWhilePending) check(data.shareWithClass, 400, "Enable class sharing to share while pending.");
    if (data.qaChapterId || imageIds) {
      z.string().trim().min(1).max(120).parse(data.topic);
      z.string().max(2000).parse(data.text);
    }
    check(
      data.text.trim() || data.audioId || data.imageId || imageIds?.length,
      400,
      "Add text, a voice recording or an image",
    );
    check(await db.subject.count({ where: { id: data.subjectId } }), 400, "Choose a valid subject.");
    if (data.audioId)
      check(
        await db.audioAttachment.findFirst({
          where: {
            id: data.audioId,
            ownerId: u.id,
            mime: { startsWith: "audio/" },
            imageQuestion: null,
            question: null,
            reply: null,
          },
        }),
      );
    const q = await createQaQuestion(u.id, data, imageIds);
    return { id: q.id };
  }
  if (resource === "question-replies") {
    check(u.role !== "STUDENT");
    const data = z
      .object({
        questionId: id,
        text: z.string().max(10000),
        audioId: id.optional(),
      })
      .strict()
      .parse(body);
    check(data.text.trim() || data.audioId, 400, "Add text or audio");
    const q = await db.anonymousQuestion.findUniqueOrThrow({
      where: { id: data.questionId },
    });
    check(!q.hidden);
    checkQaStaffAccess(u, q);
    if (data.audioId)
      check(
        await db.audioAttachment.findFirst({
          where: {
            id: data.audioId,
            ownerId: u.id,
            mime: { startsWith: "audio/" },
            imageQuestion: null,
            question: null,
            reply: null,
          },
        }),
      );
    const reply = await db.$transaction(async (tx) => {
      const answer = await tx.questionReply.create({ data: { ...data, userId: u.id } });
      await tx.notification.create({
        data: {
          userId: q.userId,
          title: "Q&A answer received",
          message: u.role === "ADMIN" ? "An admin answered your question." : "An anonymous teacher answered your question.",
          path: "/student/questions",
        },
      });
      return answer;
    });
    return { id: reply.id };
  }
  if (resource === "feedback") {
    if (method === "PATCH") {
      check(u.role === "ADMIN");
      const data = z
        .object({
          id,
          status: z.enum(["PENDING", "REVIEWED", "RESOLVED"]),
          reply: z.string().max(10000).optional(),
        })
        .strict()
        .parse(body);
      const f = await db.teacherFeedback.update({
        where: { id: data.id },
        data: { status: data.status },
      });
      if (data.reply)
        await db.feedbackReply.create({
          data: { feedbackId: f.id, adminId: u.id, text: data.reply },
        });
      await db.notification.create({
        data: {
          userId: f.studentId,
          title: "Teacher feedback update",
          message: "An administrator updated your private feedback.",
          path: "/student/feedback",
        },
      });
      await audit(u.id, "feedback.review", f.id);
      return { saved: true };
    }
    check(u.role === "STUDENT");
    const data = fields.feedback.parse(body);
    check(
      await db.teacherAssignment.findFirst({
        where: {
          userId: data.teacherId,
          batchId: { in: await batchIds(u) },
          user: { active: true, role: "TEACHER" },
        },
      }),
    );
    const f = await db.teacherFeedback.create({
      data: { ...data, studentId: u.id },
    });
    return { id: f.id };
  }
  if (resource === "exams") return mutateExam(u, method, raw);
  const key = resource as keyof typeof fields;
  check(key in fields, 404, "Unknown resource");
  check(
    [
      "batches",
      "subjects",
      "chapters",
      "enrollments",
      "assignments",
      "routines",
    ].includes(resource)
      ? u.role === "ADMIN"
      : u.role !== "STUDENT",
  );
  if (method === "DELETE") {
    check(target, 400, "Missing record ID");
    if (resource === "lessons" || resource === "resources") {
      const row =
        resource === "lessons"
          ? await db.lesson.findUniqueOrThrow({
              where: { id: target },
              include: { chapter: true },
            })
          : await db.learningResource.findUniqueOrThrow({
              where: { id: target },
              include: { chapter: true },
            });
      await academicAccess(u, row.batchId, row.chapter.subjectId);
      if (resource === "lessons")
        await db.lesson.delete({ where: { id: target } });
      else await db.learningResource.delete({ where: { id: target } });
    } else {
      check(u.role === "ADMIN");
      switch (resource) {
        case "batches":
          await db.batch.delete({ where: { id: target } });
          break;
        case "subjects":
          await db.subject.delete({ where: { id: target } });
          break;
        case "chapters":
          await db.chapter.delete({ where: { id: target } });
          break;
        case "enrollments":
          await db.enrollment.delete({ where: { id: target } });
          break;
        case "assignments":
          await db.teacherAssignment.delete({ where: { id: target } });
          break;
        case "routines":
          await db.classRoutine.delete({ where: { id: target } });
          break;
        default:
          throw new HttpError(405, "Delete is not supported");
      }
    }
    await audit(u.id, "record.delete", `${resource}/${target}`);
    return { saved: true };
  }
  const { id: _, ...payload } = raw;
  const data = fields[key].parse(payload);
  if ("chapterId" in data && "batchId" in data) {
    const chapter = await db.chapter.findUniqueOrThrow({
      where: { id: data.chapterId },
    });
    await academicAccess(u, data.batchId, chapter.subjectId);
    if (target) {
      const old =
        resource === "lessons"
          ? await db.lesson.findUniqueOrThrow({
              where: { id: target },
              include: { chapter: true },
            })
          : await db.learningResource.findUniqueOrThrow({
              where: { id: target },
              include: { chapter: true },
            });
      await academicAccess(u, old.batchId, old.chapter.subjectId);
    }
  }
  if (resource === "enrollments") {
    const d = fields.enrollments.parse(data);
    check(
      (await db.user.findUniqueOrThrow({ where: { id: d.userId } })).role ===
        "STUDENT",
      400,
      "Enroll only students",
    );
  }
  if (resource === "assignments") {
    const d = fields.assignments.parse(data);
    check(
      (await db.user.findUniqueOrThrow({ where: { id: d.userId } })).role ===
        "TEACHER",
      400,
      "Assign only teachers",
    );
  }
  let result: { id: string };
  switch (resource) {
    case "batches": {
      const d = fields.batches.parse(data);
      result = target
        ? await db.batch.update({ where: { id: target }, data: d })
        : await db.batch.create({ data: d });
      break;
    }
    case "subjects": {
      const d = fields.subjects.parse(data);
      result = target
        ? await db.subject.update({ where: { id: target }, data: d })
        : await db.subject.create({ data: d });
      break;
    }
    case "chapters": {
      const d = fields.chapters.parse(data);
      result = target
        ? await db.chapter.update({ where: { id: target }, data: d })
        : await db.chapter.create({ data: d });
      break;
    }
    case "enrollments":
      result = await db.enrollment.create({
        data: fields.enrollments.parse(data),
      });
      break;
    case "assignments":
      result = await db.teacherAssignment.create({
        data: fields.assignments.parse(data),
      });
      break;
    case "lessons": {
      const d = fields.lessons.parse(data);
      result = target
        ? await db.lesson.update({ where: { id: target }, data: d })
        : await db.lesson.create({ data: d });
      break;
    }
    case "resources": {
      const d = fields.resources.parse(data);
      result = target
        ? await db.learningResource.update({ where: { id: target }, data: d })
        : await db.learningResource.create({ data: d });
      await notifyBatch(
        d.batchId,
        "New study material",
        d.title,
        "/student/resources",
      );
      break;
    }
    case "routines": {
      const d = fields.routines.parse(data);
      check(
        new Date(d.startsAt) < new Date(d.endsAt),
        400,
        "End time must follow start time",
      );
      check(
        await db.teacherAssignment.findFirst({
          where: { userId: d.teacherId, batchId: d.batchId },
        }),
        400,
        "Teacher must be assigned to this batch",
      );
      result = await db.$transaction(
        async (tx) => {
          const conflict = await tx.classRoutine.findFirst({
            where: {
              id: target ? { not: target } : undefined,
              OR: [{ batchId: d.batchId }, { teacherId: d.teacherId }],
              startsAt: { lt: new Date(d.endsAt) },
              endsAt: { gt: new Date(d.startsAt) },
            },
          });
          check(!conflict, 409, "Schedule conflicts with an existing class");
          return target
            ? tx.classRoutine.update({ where: { id: target }, data: d })
            : tx.classRoutine.create({ data: d });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await notifyBatch(
        d.batchId,
        "Class routine updated",
        d.subject,
        "/student/routines",
      );
      break;
    }
    default:
      throw new HttpError(404, "Unknown resource");
  }
  await audit(u.id, "record.save", `${resource}/${result.id}`);
  return { id: result.id };
}
const examSchema = z
  .object({
    id: id.optional(),
    title: str,
    batchId: id,
    chapterId: id,
    durationMinutes: z.number().int().min(1).max(180),
    attemptLimit: z.number().int().min(1).max(5),
    published: z.boolean(),
    startsAt: date,
    endsAt: date,
    releaseAt: date,
    questions: z
      .array(
        z
          .object({
            text: str,
            marks: z.number().positive().max(100),
            options: z.array(str).min(4).max(8),
            correctOption: z.number().int().min(0).max(7),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
async function mutateExam(u: Actor, method: string, body: unknown) {
  check(u.role !== "STUDENT");
  const raw = z.object({ id: id.optional() }).passthrough().parse(body);
  if (
    method === "PATCH" &&
    raw.id &&
    Object.keys(raw).every((k) => ["id", "published"].includes(k))
  ) {
    const data = z.object({ id, published: z.boolean() }).strict().parse(raw);
    const old = await db.exam.findUniqueOrThrow({
      where: { id: data.id },
      include: { chapter: true },
    });
    await academicAccess(u, old.batchId, old.chapter.subjectId);
    await db.exam.update({
      where: { id: data.id },
      data: { published: data.published },
    });
    if (data.published)
      await notifyBatch(
        old.batchId,
        "New examination",
        old.title,
        "/student/exams",
      );
    await audit(u.id, "exam.publish", old.id);
    return { saved: true };
  }
  if (raw.id) {
    const old = await db.exam.findUniqueOrThrow({
      where: { id: raw.id },
      include: { chapter: true },
    });
    await academicAccess(u, old.batchId, old.chapter.subjectId);
    check(
      !(await db.examAttempt.count({ where: { examId: old.id } })),
      409,
      "Cannot modify an exam after an attempt starts",
    );
    if (method === "DELETE") {
      await db.exam.delete({ where: { id: old.id } });
      await audit(u.id, "exam.delete", old.id);
      return { saved: true };
    }
  }
  const d = examSchema.parse(body);
  const chapter = await db.chapter.findUniqueOrThrow({
    where: { id: d.chapterId },
  });
  await academicAccess(u, d.batchId, chapter.subjectId);
  check(
    new Date(d.startsAt) < new Date(d.endsAt) &&
      new Date(d.releaseAt) >= new Date(d.endsAt),
    400,
    "Result release must be at or after exam closing",
  );
  check(
    d.questions.every((q) => q.correctOption < q.options.length),
    400,
    "Invalid correct option",
  );
  const { id: examId, questions, ...data } = d;
  const exam = await db.$transaction(
    async (tx) => {
      if (examId) {
        check(
          !(await tx.examAttempt.count({ where: { examId } })),
          409,
          "Exam already started",
        );
        await tx.examQuestion.deleteMany({ where: { examId } });
      }
      const qs = questions.map((q, i) => ({
        text: q.text,
        marks: q.marks,
        correctOption: q.correctOption,
        order: i,
        options: { create: q.options.map((text, order) => ({ text, order })) },
      }));
      return examId
        ? tx.exam.update({
            where: { id: examId },
            data: { ...data, questions: { create: qs } },
          })
        : tx.exam.create({ data: { ...data, questions: { create: qs } } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  if (exam.published)
    await notifyBatch(
      exam.batchId,
      "New examination",
      exam.title,
      "/student/exams",
    );
  await audit(u.id, "exam.save", exam.id);
  return { id: exam.id };
}
export async function attemptAction(
  u: Actor,
  action: string,
  body: unknown,
): Promise<{
  id?: string;
  saved?: boolean;
  submitted?: boolean;
  expired?: boolean;
  releaseAt?: Date;
}> {
  check(u.role === "STUDENT");
  check(
    ["start", "save", "submit"].includes(action),
    404,
    "Unknown exam action",
  );
  if (action === "start") {
    const d = z.object({ examId: id }).strict().parse(body);
    const exam = await db.exam.findUniqueOrThrow({
      where: { id: d.examId },
      include: { chapter: true },
    });
    await academicAccess(u, exam.batchId, exam.chapter.subjectId);
    const now = new Date();
    check(
      exam.published && exam.startsAt <= now && exam.endsAt > now,
      400,
      "Exam is not currently available",
    );
    return db.$transaction(
      async (tx) => {
        const existing = await tx.examAttempt.findMany({
          where: { examId: exam.id, userId: u.id },
          orderBy: { number: "desc" },
        });
        const ongoing = existing.find((a) => !a.submittedAt);
        if (ongoing) return { id: ongoing.id };
        check(
          existing.length < exam.attemptLimit,
          409,
          "Attempt limit reached",
        );
        const a = await tx.examAttempt.create({
          data: {
            examId: exam.id,
            userId: u.id,
            number: existing.length + 1,
            deadline: new Date(
              Math.min(+exam.endsAt, +now + exam.durationMinutes * 60000),
            ),
          },
        });
        return { id: a.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  const d = z
    .object({
      id,
      answers: z
        .array(
          z
            .object({ questionId: id, option: z.number().int().min(0).max(7) })
            .strict(),
        )
        .max(100)
        .optional(),
    })
    .strict()
    .parse(body);
  return db.$transaction(
    async (tx) => {
      const a = await tx.examAttempt.findUniqueOrThrow({
        where: { id: d.id },
        include: {
          exam: { include: { questions: { include: { options: true } } } },
          answers: true,
        },
      });
      check(a.userId === u.id);
      check(!a.submittedAt, 409, "Attempt already submitted");
      check(
        await tx.enrollment.findUnique({
          where: { userId_batchId: { userId: u.id, batchId: a.exam.batchId } },
        }),
      );
      const expired = new Date() > a.deadline;
      if (d.answers && !expired) {
        check(
          new Set(d.answers.map((x) => x.questionId)).size === d.answers.length,
          400,
          "Duplicate answers",
        );
        for (const answer of d.answers) {
          const q = a.exam.questions.find((q) => q.id === answer.questionId);
          check(q && answer.option < q.options.length, 400, "Invalid answer");
          await tx.studentAnswer.upsert({
            where: {
              attemptId_questionId: {
                attemptId: a.id,
                questionId: answer.questionId,
              },
            },
            create: { ...answer, attemptId: a.id },
            update: { option: answer.option },
          });
        }
      }
      if (action === "submit" || expired) {
        const saved = await tx.studentAnswer.findMany({
          where: { attemptId: a.id },
        });
        const score = scoreExam(a.exam.questions, saved);
        await tx.examAttempt.update({
          where: { id: a.id },
          data: { ...score, submittedAt: expired ? a.deadline : new Date() },
        });
        return { submitted: true, expired, releaseAt: a.exam.releaseAt };
      }
      return { saved: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function readAttempt(u: Actor, attemptId: string) {
  const a = await db.examAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          questions: {
            include: { options: { orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      },
      answers: true,
    },
  });
  check(a.userId === u.id);
  await academicAccess(u, a.exam.batchId);
  if (!a.submittedAt && new Date() > a.deadline) {
    await attemptAction(u, "submit", { id: a.id });
    return readAttempt(u, attemptId);
  }
  const released = a.exam.releaseAt <= new Date() && !!a.submittedAt;
  return {
    id: a.id,
    title: a.exam.title,
    deadline: a.deadline,
    submittedAt: a.submittedAt,
    releaseAt: a.exam.releaseAt,
    answers: a.answers.map((x) => ({
      questionId: x.questionId,
      option: x.option,
    })),
    questions: a.exam.questions.map((q) => ({
      id: q.id,
      text: q.text,
      marks: q.marks,
      options: q.options.map((o) => ({ text: o.text, order: o.order })),
      ...(released ? { correctOption: q.correctOption } : {}),
    })),
    ...(released
      ? {
          score: a.score,
          total: a.total,
          correct: a.correct,
          wrong: a.answers.length - (a.correct ?? 0),
          attempted: a.answers.length,
          totalQuestions: a.exam.questions.length,
          durationSeconds: Math.round((+a.submittedAt! - +a.startedAt) / 1000),
        }
      : {}),
  };
}
