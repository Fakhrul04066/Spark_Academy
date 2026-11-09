import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { dhakaDate, revisionDates } from "../src/lib/domain";
const db = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seed is disabled in production");
  const password = process.env.DEMO_SEED_PASSWORD;
  if (!password || password.length < 12)
    throw new Error("Set DEMO_SEED_PASSWORD (12+ characters) in local .env");
  const passwordHash = await hash(password, 12);
  const admin = await db.user.upsert({
    where: { email: "admin@spark.example" },
    create: {
      email: "admin@spark.example",
      name: "Demo Administrator",
      role: "ADMIN",
      passwordHash,
    },
    update: {},
  });
  const teachers = [];
  for (let i = 1; i <= 3; i++)
    teachers.push(
      await db.user.upsert({
        where: { email: `teacher${i}@spark.example` },
        create: {
          email: `teacher${i}@spark.example`,
          name: `Demo Teacher ${i}`,
          role: "TEACHER",
          passwordHash,
        },
        update: {},
      }),
    );
  const students = [];
  for (let i = 1; i <= 20; i++)
    students.push(
      await db.user.upsert({
        where: { email: `student${i}@spark.example` },
        create: {
          email: `student${i}@spark.example`,
          name: `Demo Learner ${String(i).padStart(2, "0")}`,
          role: "STUDENT",
          passwordHash,
          studentCode: `SP-${String(i).padStart(3, "0")}`,
          className: "HSC",
          school: "Example College",
        },
        update: {},
      }),
    );
  const batches = [];
  for (const name of ["HSC Science • A", "HSC Science • B"])
    batches.push(
      await db.batch.upsert({
        where: { name },
        create: { name, className: "HSC" },
        update: {},
      }),
    );
  for (let i = 0; i < students.length; i++)
    await db.enrollment.upsert({
      where: {
        userId_batchId: {
          userId: students[i].id,
          batchId: batches[i < 15 ? 0 : 1].id,
        },
      },
      create: { userId: students[i].id, batchId: batches[i < 15 ? 0 : 1].id },
      update: {},
    });
  const chapters = [];
  for (const [index, name] of [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Biology",
  ].entries()) {
    const subject = await db.subject.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    const chapter = await db.chapter.upsert({
      where: {
        subjectId_name: {
          subjectId: subject.id,
          name: [
            "Motion & Forces",
            "Atomic Structure",
            "Functions",
            "Cell Biology",
          ][index],
        },
      },
      create: {
        subjectId: subject.id,
        name: [
          "Motion & Forces",
          "Atomic Structure",
          "Functions",
          "Cell Biology",
        ][index],
      },
      update: {},
    });
    chapters.push(chapter);
    for (const b of batches)
      await db.teacherAssignment.upsert({
        where: {
          userId_batchId_subjectId: {
            userId: teachers[index % 3].id,
            batchId: b.id,
            subjectId: subject.id,
          },
        },
        create: {
          userId: teachers[index % 3].id,
          batchId: b.id,
          subjectId: subject.id,
        },
        update: {},
      });
  }
  const batch = batches[0],
    chapter = chapters[0];
  // MIT OpenCourseWare, verified public educational video. Attribution: docs/SOURCES.md.
  if (
    !(await db.lesson.findFirst({
      where: { batchId: batch.id, title: "Newton’s First and Second Laws" },
    }))
  )
    await db.lesson.create({
      data: {
        title: "Newton’s First and Second Laws",
        description:
          "MIT OpenCourseWare · 8.01 Classical Mechanics. External educational reference.",
        youtubeUrl: "https://www.youtube.com/watch?v=89SjJv30kGU",
        batchId: batch.id,
        chapterId: chapter.id,
        order: 0,
      },
    });
  if (!(await db.learningResource.count()))
    await db.learningResource.create({
      data: {
        title: "MIT OpenCourseWare — Newton’s Laws Instructor Guide",
        type: "PDF",
        url: "https://ocw.mit.edu/courses/res-tll-004-stem-concept-videos-fall-2013/76e11a4fbd5703e38cc63d96c81c1d85_MITRES_TLL-004F13_Nwton_IG.pdf",
        batchId: batch.id,
        chapterId: chapter.id,
      },
    });
  if (!(await db.exam.count())) {
    const exam = await db.exam.create({
      data: {
        title: "Motion & Forces — Foundation Check",
        batchId: batch.id,
        chapterId: chapter.id,
        durationMinutes: 20,
        published: true,
        startsAt: new Date(Date.now() - 3600000),
        endsAt: new Date(Date.now() + 86400000),
        releaseAt: new Date(Date.now() + 86400000),
        questions: {
          create: [
            {
              text: "Which quantity is a vector?",
              marks: 1,
              order: 0,
              correctOption: 1,
              options: {
                create: ["Speed", "Velocity", "Distance", "Mass"].map(
                  (text, order) => ({ text, order }),
                ),
              },
            },
            {
              text: "The SI unit of force is…",
              marks: 1,
              order: 1,
              correctOption: 0,
              options: {
                create: ["Newton", "Joule", "Watt", "Pascal"].map(
                  (text, order) => ({ text, order }),
                ),
              },
            },
          ],
        },
      },
    });
    const released = await db.exam.create({
      data: {
        title: "Previous Practice — Sample Results",
        batchId: batch.id,
        chapterId: chapter.id,
        durationMinutes: 15,
        published: true,
        startsAt: new Date(Date.now() - 3 * 86400000),
        endsAt: new Date(Date.now() - 2 * 86400000),
        releaseAt: new Date(Date.now() - 86400000),
        questions: {
          create: {
            text: "What is inertia?",
            marks: 10,
            order: 0,
            correctOption: 0,
            options: {
              create: [
                "Resistance to change in motion",
                "Speed",
                "Energy",
                "Power",
              ].map((text, order) => ({ text, order })),
            },
          },
        },
      },
    });
    for (let i = 0; i < 15; i++)
      await db.examAttempt.create({
        data: {
          examId: released.id,
          userId: students[i].id,
          number: 1,
          startedAt: new Date(Date.now() - 3 * 86400000),
          deadline: new Date(Date.now() - 3 * 86400000 + 900000),
          submittedAt: new Date(Date.now() - 3 * 86400000 + 500000),
          score: i % 3 === 0 ? 10 : 0,
          total: 10,
          correct: i % 3 === 0 ? 1 : 0,
        },
      });
    await db.notification.create({
      data: {
        userId: students[0].id,
        title: "Welcome to Spark Academy",
        message: "Your learning space is ready. Explore your assigned batch.",
        path: "/student/batches",
      },
    });
  }
  const date = dhakaDate();
  for (let d = 0; d < 5; d++) {
    const dt = new Date(date + "T00:00:00Z");
    dt.setUTCDate(dt.getUTCDate() - d);
    const session = await db.attendanceSession.upsert({
      where: {
        batchId_date: {
          batchId: batch.id,
          date: dt.toISOString().slice(0, 10),
        },
      },
      create: { batchId: batch.id, date: dt.toISOString().slice(0, 10) },
      update: {},
    });
    for (let i = 0; i < 15; i++)
      await db.attendanceRecord.upsert({
        where: {
          sessionId_userId: { sessionId: session.id, userId: students[i].id },
        },
        create: {
          sessionId: session.id,
          userId: students[i].id,
          present: (i + d) % 5 !== 0,
        },
        update: {},
      });
  }
  if (!(await db.classRoutine.count()))
    await db.classRoutine.create({
      data: {
        batchId: batch.id,
        teacherId: teachers[0].id,
        subject: "Physics",
        location: "Classroom A",
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
      },
    });
  if (!(await db.revisionTopic.count())) {
    const topic = await db.revisionTopic.create({
      data: {
        userId: students[0].id,
        chapterId: chapter.id,
        name: "Newton’s laws",
        learningDate: date,
        status: "RED",
      },
    });
    await db.revisionSchedule.createMany({
      data: revisionDates(date, "RED").map((dueDate) => ({
        topicId: topic.id,
        version: 1,
        dueDate,
      })),
    });
    await db.googleSheetSyncJob.create({
      data: { topicId: topic.id, version: 1 },
    });
  }
  if (!(await db.anonymousQuestion.count()))
    await db.anonymousQuestion.create({
      data: {
        userId: students[0].id,
        batchId: batch.id,
        subjectId: chapter.subjectId,
        topic: "Inertia",
        text: "Why does a passenger lean forward when a bus stops?",
      },
    });
  if (!(await db.teacherFeedback.count()))
    await db.teacherFeedback.create({
      data: {
        studentId: students[0].id,
        teacherId: teachers[0].id,
        category: "Suggestion",
        subject: "Practice examples",
        message: "More worked examples would help me understand the chapter.",
      },
    });
  await db.auditLog.create({
    data: {
      actorId: admin.id,
      action: "development.seed",
      resource: "sample-data",
    },
  });
  console.log(
    "Local demo data ready: admin@spark.example, teacher1@spark.example, student1@spark.example. Password: use your local DEMO_SEED_PASSWORD.",
  );
}
main().finally(() => db.$disconnect());
