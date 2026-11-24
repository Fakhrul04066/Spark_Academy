"use client";
import { RevisionDate } from "./revision-date";
import { ImageAttachment } from "./image-attachment";
import { StudyDashboard } from "./study-dashboard";
import { StudentBilling } from "./billing";
import { ClassRecordDetails, TeacherClasses, type ClassRecord } from "./teacher-classes";
import { BLOOD_GROUPS } from "@/lib/profile";

import Link from "next/link";

import { useCallback, useEffect, useState, useRef } from "react";

import {
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  ArrowUpRight,
  Plus,
  Search,
  Check,
  Trash2,
  Pencil,
  Users,
  Clock,
  Download,
} from "lucide-react";

import { navigation } from "@/lib/navigation";

import { dhakaDate } from "@/lib/domain";

import { VoiceRecorder, PrivateAudio } from "./voice-recorder";

import { ProgressChart } from "./charts";

import { ExamRunner } from "./exam-runner";

// API view models are intentionally distinct from Prisma entities.

type Row = Record<string, any>;

type Field = {
  key: string;
  label: string;
  type?: string;
  source?: string;
  options?: string[];
  required?: boolean;
};

const forms: Record<string, Field[]> = {
  "class-records": [
    { key: "teacherId", label: "Teacher", source: "teachers" },
    { key: "batchId", label: "Class or batch", source: "batches" },
    { key: "subjectId", label: "Subject", source: "subjects" },
    { key: "classNumber", label: "Class number", type: "number" },
    { key: "amountTaka", label: "Class payment (৳)", type: "money" },
    { key: "date", label: "Date taught", type: "date" },
    { key: "payment", label: "Payment status", options: ["Unpaid", "Paid"] },
    { key: "adminComment", label: "Admin comments", type: "textarea", required: false },
  ],
  students: [
    { key: "name", label: "Full name" },
    { key: "email", label: "Email address", type: "email" },
    {
      key: "password",
      label: "Initial password (12+ characters)",
      type: "password",
    },
    { key: "studentCode", label: "Student ID" },
    { key: "className", label: "Class" },
  ],

  teachers: [
    { key: "name", label: "Full name" },
    { key: "teacherCode", label: "Teacher ID", required: false },
    { key: "email", label: "Email address", type: "email" },
    {
      key: "password",
      label: "Initial password (12+ characters)",
      type: "password",
    },
  ],

  batches: [
    { key: "name", label: "Batch name" },
    { key: "className", label: "Class" },
  ],
  subjects: [{ key: "name", label: "Subject name" }],
  chapters: [
    { key: "name", label: "Chapter name" },
    { key: "subjectId", label: "Subject", source: "subjects" },
  ],

  enrollments: [
    { key: "userId", label: "Student", source: "students" },
    { key: "batchId", label: "Batch", source: "batches" },
  ],

  assignments: [
    { key: "userId", label: "Teacher", source: "teachers" },
    { key: "batchId", label: "Batch", source: "batches" },
    { key: "subjectId", label: "Subject", source: "subjects" },
  ],

  lessons: [
    { key: "title", label: "Lesson title" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "batchId", label: "Batch", source: "batches" },
    { key: "chapterId", label: "Chapter", source: "chapters" },
    { key: "youtubeUrl", label: "YouTube video URL", type: "url" },
    { key: "order", label: "Display order", type: "number" },
  ],

  resources: [
    { key: "title", label: "Resource title" },
    {
      key: "type",
      label: "Resource type",
      options: ["PDF", "Slides", "Drive", "Website", "Notes"],
    },
    { key: "batchId", label: "Batch", source: "batches" },
    { key: "chapterId", label: "Chapter", source: "chapters" },
    { key: "url", label: "Secure resource URL", type: "url" },
  ],

  routines: [
    { key: "batchId", label: "Batch", source: "batches" },
    { key: "teacherId", label: "Teacher", source: "teachers" },
    { key: "subject", label: "Subject" },
    { key: "location", label: "Classroom / delivery mode" },
    {
      key: "startsAt",
      label: "Start (your device time)",
      type: "datetime-local",
    },
    { key: "endsAt", label: "End (your device time)", type: "datetime-local" },
  ],

  revision: [
    { key: "chapterId", label: "Chapter", source: "chapters" },
    { key: "name", label: "Topic name" },
    { key: "learningDate", label: "Learning date (Dhaka)", type: "date" },
    {
      key: "status",
      label: "Understanding",
      options: ["RED", "YELLOW", "GREEN"],
    },
  ],

  feedback: [
    { key: "teacherId", label: "Teacher", source: "teachers" },
    {
      key: "category",
      label: "Category",
      options: [
        "Teaching Quality",
        "Class Explanation",
        "Communication",
        "Academic Support",
        "Complaint",
        "Suggestion",
        "Other",
      ],
    },
    { key: "subject", label: "Subject" },
    { key: "message", label: "Private message to admin", type: "textarea" },
  ],

  questions: [
    { key: "batchId", label: "Batch", source: "batches" },
    { key: "subjectId", label: "Subject", source: "subjects" },
    { key: "topic", label: "Topic" },
    { key: "text", label: "Your question", type: "textarea", required: false },
  ],

  notifications: [
    { key: "batchId", label: "Batch", source: "batches" },
    { key: "title", label: "Announcement title" },
    { key: "message", label: "Message", type: "textarea" },
  ],
};

export async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch("/api/" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Request failed");
  return result.data;
}

const when = (v: string) =>
  new Date(v).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function Workspace({
  role,
  name,
  module,
  recordId,
}: {
  role: keyof typeof navigation;
  name: string;
  module: string;
  recordId?: string;
}) {
  const [data, setData] = useState<any>(null),
    [catalog, setCatalog] = useState<Row>({}),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState<Row | null>(null),
    [showForm, setShowForm] = useState(false),
    [filter, setFilter] = useState("all"),
    [batchFilter, setBatchFilter] = useState(""),
    [dateFilter, setDateFilter] = useState(""),
    [studentFilter, setStudentFilter] = useState("");

  const requestId = useRef(0);
  const base = "/" + role.toLowerCase();
  const teacherClasses = role === "TEACHER" && module === "batches";
  const endpoint = teacherClasses ? "class-records" : module === "settings" ? "profile" : module;

  const load = useCallback(async () => {
    const sequence = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      if (module === "attempt") {
        setData({});
        return;
      }
      const [d, c] = await Promise.all([
        api(
          `${endpoint}?page=${page}&q=${encodeURIComponent(query)}&batchId=${encodeURIComponent(batchFilter)}&date=${dateFilter}&studentId=${encodeURIComponent(studentFilter)}`,
        ),
        api("catalog"),
      ]);
      if (sequence !== requestId.current) return;
      setData(d);
      setCatalog(c);
      if (module === "dashboard") {
        const [
          progress,
          attendance,
          exams,
          results,
          revisions,
          questions,
        ] = await Promise.all([
          role === "TEACHER" ? [] : api("progress"),
          role === "TEACHER" ? [] : api("attendance"),
          api("exams?open=true"),
          role === "TEACHER" ? [] : api("results"),
          role === "TEACHER" ? [] : api("revision-schedules"),
          role === "TEACHER" ? [] : api("questions"),
        ]);
        if (sequence === requestId.current)
          setCatalog({
            ...c,
            progress,
            attendance,
            exams,
            results,
            revisions,
            questions,
          });
      }
    } catch (e) {
      if (sequence === requestId.current)
        setError(e instanceof Error ? e.message : "Could not load data");
    } finally {
      if (sequence === requestId.current) setLoading(false);
    }
  }, [endpoint, page, query, module, role, batchFilter, dateFilter, studentFilter]);

  useEffect(() => {
    load();
    setShowForm(false);
    setEditing(null);
    return () => {
      requestId.current++;
    };
  }, [load]);
  useEffect(() => {
    setPage(1);
    setQuery("");
    setSearch("");
    setFilter("all");
    setBatchFilter("");
    setDateFilter("");
    setStudentFilter("");
    setSuccess("");
  }, [module]);

  async function act(resource: string, method: string, body: unknown) {
    try {
      setError("");
      await api(resource, method, body);
      if (resource === "profile")
        window.dispatchEvent(new CustomEvent("profile-updated", { detail: { name: (body as Row).name } }));
      if (resource === "notifications")
        window.dispatchEvent(new Event("notifications-updated"));
      setSuccess("Saved successfully.");
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      return false;
    }
  }

  const title =
    navigation[role].find(([key]) => key === module)?.[1] || "Examination";

  const canCreate =
    role === "ADMIN"
      ? !!forms[module] || module === "exams"
      : role === "TEACHER"
        ? ["lessons", "resources", "exams"].includes(module)
        : ["questions", "revision", "feedback"].includes(module);

  if (module === "attempt" && recordId) return <ExamRunner id={recordId} />;

  return (
    <>
      {module !== "dashboard" && <div className="page-head row">
        <div>
          <span className="eyebrow">SPARK ACADEMY / {role.toLowerCase()}</span>
          <h1 className="mt-2">{title}</h1>
          {!teacherClasses && module !== "class-records" && <p>
            {module === "dashboard"
              ? `Welcome back, ${name.split(" ")[0]}. Let’s make today count.`
              : module === "questions"
                ? "A safe space for thoughtful questions and recorded answers."
                : module === "feedback"
                  ? "Confidential feedback between students and administrators."
                  : "Your academic information, organized and up to date."}
          </p>}
        </div>
        {canCreate && (
          <button
            className="btn"
            onClick={() => {
              setEditing(null);
              setShowForm(!showForm);
            }}
          >
            <Plus size={16} />
            Add{" "}
            {module === "revision"
              ? "topic"
              : module === "questions"
                ? "question"
                : module === "feedback"
                  ? "feedback"
                  : module === "exams"
                    ? "exam"
                    : module === "class-records" ? "class record" : "new"}
          </button>
        )}
      </div>}

      {error && (
        <div role="alert" className="error mb-5">
          {error}{" "}
          <button className="underline" onClick={load}>
            Retry
          </button>
        </div>
      )}
      {success && (
        <div role="status" className="success mb-5 row">
          {success}
          <button
            aria-label="Dismiss notification"
            onClick={() => setSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      {showForm &&
        (module === "exams" ? (
          <ExamEditor
            catalog={catalog}
            value={editing}
            onSave={async (body) => {
              if (await act("exams", editing ? "PATCH" : "POST", body))
                setShowForm(false);
            }}
          />
        ) : (
          <RecordForm
            key={module === "class-records" ? editing?.id || "new-class-record" : undefined}
            module={module}
            fields={
              editing && ["students", "teachers"].includes(module)
                ? [
                    { key: "name", label: "Full name" },
                    ...(module === "students"
                      ? [
                          { key: "className", label: "Class", required: false },
                          {
                            key: "studentCode",
                            label: "Student ID",
                            required: false,
                          },
                          { key: "group", label: "Group", required: false },
                          {
                            key: "guardianName",
                            label: "Guardian name",
                            required: false,
                          },
                          {
                            key: "guardianContact",
                            label: "Guardian contact",
                            required: false,
                          },
                        ]
                      : [
                          { key: "teacherCode", label: "Teacher ID", required: false },
                        ]),
                    { key: "phone", label: "Phone", required: false },
                    {
                      key: "school",
                      label: "School / college",
                      required: false,
                    },
                  ]
                : forms[module] || []
            }
            value={editing}
            catalog={catalog}
            onCancel={() => setShowForm(false)}
            onSave={async (body) => {
              if (await act(module, editing ? "PATCH" : "POST", body))
                setShowForm(false);
            }}
          />
        ))}

      {loading ? (
        <div className="grid two">
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : (
        data && (
          <>
            {teacherClasses ? (
              <TeacherClasses records={data} batches={catalog.batches || []} />
            ) : module === "dashboard" ? (
              <StudyDashboard
                role={role}
                name={name}
                data={data}
                catalog={catalog}
                base={base}
              />
            ) : module === "profile" || module === "settings" ? (
              <Profile
                data={data}
                isTeacher={role === "TEACHER"}
                save={(body) => act("profile", "PATCH", body)}
              />
            ) : module === "reports" ? (
              <div className="stack">
                <div className="grid four">
                  {[
                    "students",
                    "teachers",
                    "batches",
                    "class-records",
                    "exams",
                    "questions",
                    "feedback",
                  ].map((k) => (
                    <div className="card stat" key={k}>
                      <strong>{data[k]}</strong>
                      <p className="capitalize">{k}</p>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <h3>Integration delivery states</h3>
                  <p className="mt-3">
                    Email:{" "}
                    {data.email
                      .map((r: Row) => `${r.status} (${r._count})`)
                      .join(", ") || "No jobs yet"}
                  </p>
                  <p>
                    Google Sheets:{" "}
                    {data.sheets
                      .map((r: Row) => `${r.status} (${r._count})`)
                      .join(", ") || "No jobs yet"}
                  </p>
                </div>
                <GenericTable data={data.audit} />
              </div>
            ) : (
              <>
                <div className="row mb-5">
                  {[
                    "students",
                    "teachers",
                    "batches",
                    "subjects",
                    "lessons",
                    "resources",
                    "exams",
                    "revision",
                  ].includes(module) && (
                    <form
                      className="flex"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setQuery(search);
                        setPage(1);
                      }}
                    >
                      <input
                        aria-label="Search records"
                        className="input"
                        style={{ width: 230 }}
                        placeholder="Search this page…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <button className="btn secondary" aria-label="Search">
                        <Search size={16} />
                      </button>
                    </form>
                  )}
                  <div className="flex">
                    {["questions", "revision"].includes(module) && (
                      <select
                        aria-label="Filter records"
                        className="input"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        {(module === "questions"
                          ? ["all", "pending", "answered"]
                          : [
                              "all",
                              "RED",
                              "YELLOW",
                              "GREEN",
                              "today",
                              "overdue",
                              "completed",
                            ]
                        ).map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    )}
                    {role === "ADMIN" && module === "attendance" && (
                      <button
                        className="btn secondary small"
                        onClick={() => exportCsv(data)}
                      >
                        <Download size={14} />
                        Export CSV
                      </button>
                    )}
                    {module === "notifications" && (
                      <button
                        className="btn secondary small"
                        onClick={() => act("notifications", "PATCH", {})}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {module === "attendance" && role === "ADMIN" && (
                  <div className="card grid three mb-5">
                    <label className="label">
                      Filter by batch
                      <select
                        className="input"
                        value={batchFilter}
                        onChange={(e) => {
                          setBatchFilter(e.target.value);
                          setPage(1);
                        }}
                      >
                        <option value="">All batches</option>
                        {catalog.batches?.map((b: Row) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="label">
                      Filter by student
                      <select
                        className="input"
                        value={studentFilter}
                        onChange={(e) => {
                          setStudentFilter(e.target.value);
                          setPage(1);
                        }}
                      >
                        <option value="">All students</option>
                        {catalog.students?.map((s: Row) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="label">
                      Filter by date
                      <input
                        className="input"
                        type="date"
                        value={dateFilter}
                        onChange={(e) => {
                          setDateFilter(e.target.value);
                          setPage(1);
                        }}
                      />
                    </label>
                  </div>
                )}
                {module === "attendance" && role !== "STUDENT" && (
                  <AttendanceForm
                    catalog={catalog}
                    save={(body) => act("attendance", "POST", body)}
                  />
                )}

                {Array.isArray(data) && data.length === 0 ? (
                  <Empty
                    title="Nothing here yet"
                    text={
                      canCreate
                        ? "Add the first record to get started."
                        : "Your assigned information will appear here once it is available."
                    }
                  />
                ) : (
                  <div
                    className={
                      [
                        "lessons",
                        "resources",
                        "exams",
                        "revision",
                        "progress",
                      ].includes(module)
                        ? "grid two"
                        : "stack"
                    }
                  >
                    {Array.isArray(data) &&
                      data
                        .filter((r: Row) =>
                          module === "questions"
                            ? filter === "all" ||
                              (filter === "answered"
                                ? r.replies.length > 0
                                : r.replies.length === 0)
                            : module === "revision"
                              ? filter === "all" ||
                                r.status === filter ||
                                (filter === "today" &&
                                  r.schedules.some(
                                    (s: Row) =>
                                      !s.completedAt &&
                                      !s.cancelled &&
                                      s.dueDate === dhakaDate(),
                                  )) ||
                                (filter === "overdue" &&
                                  r.schedules.some(
                                    (s: Row) =>
                                      !s.completedAt &&
                                      !s.cancelled &&
                                      s.dueDate < dhakaDate(),
                                  )) ||
                                (filter === "completed" &&
                                  r.schedules.some((s: Row) => s.completedAt))
                              : true,
                        )
                        .map((r: Row) => (
                          <article
                            className={`card ${module === "questions" ? "question" : ""}`}
                            key={r.id || r.subject}
                          >
                            {["lessons", "resources"].includes(module) ? (
                              <>
                                <span className="eyebrow">
                                  {r.chapter.subject.name} / {r.chapter.name}
                                </span>
                                <h3 className="mt-3 mb-2">{r.title}</h3>
                                <p>{r.description || r.type}</p>
                                <div className="row mt-5">
                                  <a
                                    className="btn secondary"
                                    href={r.youtubeUrl || r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {module === "lessons"
                                      ? "Watch on YouTube"
                                      : "Open resource"}
                                    <ArrowUpRight size={15} />
                                  </a>
                                  {module === "lessons" &&
                                    role === "STUDENT" && (
                                      <button
                                        className="btn small"
                                        onClick={() =>
                                          act("progress", "POST", {
                                            lessonId: r.id,
                                            completed: !r.progress.length,
                                          })
                                        }
                                      >
                                        <Check size={14} />
                                        {r.progress.length
                                          ? "Completed · undo"
                                          : "Mark as completed"}
                                      </button>
                                    )}
                                </div>
                              </>
                            ) : module === "exams" ? (
                              <>
                                <div className="row">
                                  <span className="pill">
                                    {r.chapter.subject.name}
                                  </span>
                                  <span className="status">
                                    {r.published ? "Published" : "Draft"}
                                  </span>
                                </div>
                                <h3 className="mt-4 mb-3">{r.title}</h3>
                                <p>
                                  {r._count.questions} questions ·{" "}
                                  {r.durationMinutes} minutes · {r.attemptLimit}{" "}
                                  attempt(s)
                                </p>
                                <p className="text-xs mt-2">
                                  Available: {when(r.startsAt)} –{" "}
                                  {when(r.endsAt)} Dhaka
                                </p>
                                <p className="footnote">
                                  Results: {when(r.releaseAt)} Dhaka
                                </p>
                                {role !== "STUDENT" && (
                                  <div className="flex mt-4">
                                    <button
                                      className="btn secondary small"
                                      onClick={() =>
                                        act("exams", "PATCH", {
                                          id: r.id,
                                          published: !r.published,
                                        })
                                      }
                                    >
                                      {r.published ? "Unpublish" : "Publish"}
                                    </button>
                                    <button
                                      className="btn secondary small"
                                      onClick={async () => {
                                        try {
                                          setEditing(
                                            await api("exams/" + r.id),
                                          );
                                          setShowForm(true);
                                          window.scrollTo({ top: 0 });
                                        } catch (e) {
                                          setError((e as Error).message);
                                        }
                                      }}
                                    >
                                      Edit exam
                                    </button>
                                  </div>
                                )}
                                {role === "STUDENT" && (
                                  <button
                                    className="btn mt-5"
                                    onClick={async () => {
                                      try {
                                        const result = await api(
                                          "exam-attempts/start",
                                          "POST",
                                          { examId: r.id },
                                        );
                                        window.location.href = `${base}/attempt/${result.id}`;
                                      } catch (e) {
                                        setError((e as Error).message);
                                      }
                                    }}
                                  >
                                    Start / resume exam →
                                  </button>
                                )}
                              </>
                            ) : module === "progress" ? (
                              <>
                                <div className="row">
                                  <h3>{r.subject}</h3>
                                  <strong>{r.percentage}%</strong>
                                </div>
                                <div className="bar my-5">
                                  <span style={{ width: `${r.percentage}%` }} />
                                </div>
                                <p>
                                  {r.completed} / {r.total} lessons ·{" "}
                                  {r.completedChapters} / {r.chapters} chapters
                                  complete
                                </p>
                                <p className="text-xs mt-3">
                                  Average exam score:{" "}
                                  {r.averageScore === null
                                    ? "No released results"
                                    : `${r.averageScore}%`}
                                </p>
                                {r.weakTopics?.length > 0 && (
                                  <p className="notice mt-3">
                                    Needs practice: {r.weakTopics.join(", ")}
                                  </p>
                                )}
                              </>
                            ) : module === "questions" ? (
                              <>
                                <div className="row">
                                  <span className="pill">
                                    {r.replies.length ? "Answered" : "Pending"}
                                  </span>
                                  <span className="footnote">
                                    {when(r.createdAt)}
                                  </span>
                                </div>
                                <h3 className="mt-4">{r.topic}</h3>
                                <p className="text-xs mt-2">{r.author}</p>
                                <p className="mt-3 whitespace-pre-wrap">
                                  {r.text}
                                </p>
                                {r.imageId && (
                                  <a
                                    href={`/api/question-images/${r.imageId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <img
                                      className="doubt-image"
                                      src={`/api/question-images/${r.imageId}`}
                                      alt="Attached doubt illustration"
                                    />
                                  </a>
                                )}
                                {r.audioId && (
                                  <div className="mt-3">
                                    <PrivateAudio id={r.audioId} />
                                  </div>
                                )}
                                {r.replies.map((reply: Row) => (
                                  <div
                                    className="bg-slate-50 rounded-xl p-4 mt-4"
                                    key={reply.id}
                                  >
                                    <strong className="text-xs">
                                      {reply.author}
                                    </strong>
                                    <p className="mt-2 whitespace-pre-wrap">
                                      {reply.text}
                                    </p>
                                    {reply.audioId && (
                                      <PrivateAudio id={reply.audioId} />
                                    )}
                                  </div>
                                ))}
                                <div className="flex mt-4">
                                  <button
                                    className="btn secondary small"
                                    onClick={() =>
                                      act("questions", "PATCH", {
                                        id: r.id,
                                        reported: true,
                                      })
                                    }
                                  >
                                    {r.reported ? "Reported" : "Report concern"}
                                  </button>
                                  {role === "ADMIN" && (
                                    <button
                                      className="btn danger small"
                                      onClick={() =>
                                        act("questions", "PATCH", {
                                          id: r.id,
                                          hidden: !r.hidden,
                                        })
                                      }
                                    >
                                      {r.hidden ? "Restore" : "Hide question"}
                                    </button>
                                  )}
                                </div>
                                {role !== "STUDENT" && (
                                  <ReplyForm
                                    voice
                                    onSave={(body) =>
                                      act("question-replies", "POST", {
                                        questionId: r.id,
                                        ...body,
                                      })
                                    }
                                  />
                                )}
                              </>
                            ) : module === "feedback" ? (
                              <>
                                <div className="row">
                                  <h3>{r.subject}</h3>
                                  <span className="status">{r.status}</span>
                                </div>
                                <p className="text-xs mt-3">
                                  Teacher: {r.teacher.name} · {r.category}
                                </p>
                                <p className="mt-3 whitespace-pre-wrap">
                                  {r.message}
                                </p>
                                {r.replies.map((reply: Row) => (
                                  <div
                                    className="bg-slate-50 rounded-lg p-4 mt-4"
                                    key={reply.id}
                                  >
                                    <strong className="text-xs">
                                      Administrator reply
                                    </strong>
                                    <p>{reply.text}</p>
                                  </div>
                                ))}
                                {role === "ADMIN" && (
                                  <ReplyForm
                                    onSave={(body) =>
                                      act("feedback", "PATCH", {
                                        id: r.id,
                                        status: "REVIEWED",
                                        reply: body.text,
                                      })
                                    }
                                  />
                                )}{" "}
                                {role === "ADMIN" && (
                                  <button
                                    className="btn secondary small mt-3"
                                    onClick={() =>
                                      act("feedback", "PATCH", {
                                        id: r.id,
                                        status: "RESOLVED",
                                      })
                                    }
                                  >
                                    Mark resolved
                                  </button>
                                )}
                              </>
                            ) : module === "revision" ? (
                              <>
                                <div className="row">
                                  <div
                                    className="revision-lights"
                                    aria-label={`Revision progress: ${r.status.toLowerCase()}`}
                                  >
                                    {["RED", "YELLOW", "GREEN"].map((color) => (
                                      <span
                                        key={color}
                                        className={`revision-light ${color} ${r.status === color ? "active" : ""}`}
                                      />
                                    ))}
                                  </div>
                                  <span className={`status ${r.status}`}>
                                    {r.status}
                                  </span>
                                  <span className="footnote">
                                    Automatic · based on completed revisions
                                  </span>
                                </div>
                                <h3 className="mt-4">{r.name}</h3>
                                <p className="text-xs mt-2">
                                  {r.chapter.subject.name} / {r.chapter.name} ·
                                  Learned {r.learningDate}
                                </p>
                                <div className="timeline">
                                  {r.schedules
                                    .filter((s: Row) => !s.cancelled)
                                    .map((s: Row) => (
                                      <RevisionDate
                                        key={s.id}
                                        date={s.dueDate}
                                        topic={r.name}
                                        completed={!!s.completedAt}
                                        onSave={(completed) =>
                                          act("revision-schedules", "PATCH", {
                                            id: s.id,
                                            completed,
                                          })
                                        }
                                      />
                                    ))}
                                </div>
                                {r.status === "GREEN" && (
                                  <p className="footnote">
                                    All revisions complete. Your history is
                                    preserved.
                                  </p>
                                )}
                              </>
                            ) : module === "notifications" ? (
                              <div className="row">
                                <div>
                                  <span className="status">
                                    {r.readAt ? "Read" : "New"}
                                  </span>
                                  <h3 className="mt-3">{r.title}</h3>
                                  <p className="mt-2">{r.message}</p>
                                  <Link
                                    href={r.path.replace(
                                      "/student/",
                                      base + "/",
                                    )}
                                    className="text-slate-700 text-xs"
                                  >
                                    Open related page →
                                  </Link>
                                </div>
                                {!r.readAt && (
                                  <button
                                    className="btn secondary small"
                                    onClick={() =>
                                      act("notifications", "PATCH", {
                                        id: r.id,
                                      })
                                    }
                                  >
                                    Mark read
                                  </button>
                                )}
                              </div>
                            ) : module === "routines" ? (
                              <>
                                <span className="eyebrow">{r.location}</span>
                                <h3 className="mt-3">{r.subject}</h3>
                                <p className="mt-3">
                                  {when(r.startsAt)} – {when(r.endsAt)} ·
                                  Asia/Dhaka
                                </p>
                              </>
                            ) : module === "attendance" ? (
                              <>
                                <h3>
                                  {r.date} · {r.batch.name}
                                </h3>
                                <div className="flex mt-4">
                                  {r.records.map((a: Row) => (
                                    <span
                                      className={`status ${a.present ? "GREEN" : "RED"}`}
                                      key={a.id}
                                    >
                                      {a.user.name}:{" "}
                                      {a.present ? "Present" : "Absent"}
                                    </span>
                                  ))}
                                </div>
                              </>
                            ) : module === "results" ? (
                              <>
                                <div className="row">
                                  <h3>{r.title}</h3>
                                  <span className="pill">
                                    Position #{r.position}
                                  </span>
                                </div>
                                <p className="mt-3">
                                  {r.student} · {r.subject}
                                </p>
                                <div className="flex mt-4">
                                  <strong className="text-2xl">
                                    {r.score} / {r.total}
                                  </strong>
                                  <span className="status">
                                    {r.percentage}%
                                  </span>
                                </div>
                                <p className="footnote mt-3">
                                  Competition ranking; tied scores share a
                                  position.
                                </p>
                              </>
                            ) : module === "revision-schedules" ? (
                              <div className="row">
                                <div>
                                  <h3>{r.topic.name}</h3>
                                  <p>{r.dueDate}</p>
                                </div>
                                <span className="status">
                                  {r.completedAt ? "Completed" : "Pending"}
                                </span>
                              </div>
                            ) : module === "class-records" ? (
                              <>
                                <p className="muted">{r.teacher.name}</p>
                                <ClassRecordDetails record={r as ClassRecord} />
                                <p className="mt-2">Class payment <strong>৳{(r.amountMinor / 100).toLocaleString("en-BD", { maximumFractionDigits: 2 })}</strong></p>
                                <button
                                  className="btn secondary small mt-4"
                                  onClick={() => {
                                    setEditing({ ...r, amountTaka: (r.amountMinor / 100).toFixed(2), payment: r.paid ? "Paid" : "Unpaid" });
                                    setShowForm(true);
                                    window.scrollTo({ top: 0 });
                                  }}
                                >
                                  Edit class record
                                </button>
                              </>
                            ) : (
                              <>
                                <h3>
                                  {r.name || r.user?.name || r.title || r.id}
                                </h3>
                                <p className="mt-2">
                                  {[
                                    r.email,
                                    module === "teachers" && r.teacherCode,
                                    r.className,
                                    r.subject?.name,
                                    r.batch?.name,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                                {r.active !== undefined && (
                                  <span className="status mt-3">
                                    {r.active ? "Active" : "Inactive"}
                                  </span>
                                )}
                              </>
                            )}

                            {role === "ADMIN" &&
                              ["students", "teachers"].includes(module) && (
                                <button
                                  className="btn secondary small mt-4"
                                  onClick={() => {
                                    setEditing(r);
                                    setShowForm(true);
                                    window.scrollTo({ top: 0 });
                                  }}
                                >
                                  Edit details
                                </button>
                              )}
                            {role === "ADMIN" &&
                              ["students", "teachers"].includes(module) && (
                                <button
                                  className="btn secondary small mt-4"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `${r.active ? "Deactivate" : "Activate"} this account?`,
                                      )
                                    )
                                      act(module, "PATCH", {
                                        id: r.id,
                                        active: !r.active,
                                      });
                                  }}
                                >
                                  {r.active ? "Deactivate" : "Activate"}
                                </button>
                              )}

                            {(role === "ADMIN" ||
                              (role === "TEACHER" &&
                                ["lessons", "resources"].includes(module))) &&
                              [
                                "batches",
                                "subjects",
                                "chapters",
                                "lessons",
                                "resources",
                                "routines",
                                "enrollments",
                                "assignments",
                              ].includes(module) && (
                                <div className="flex mt-4 border-t border-slate-100 pt-4">
                                  {!["enrollments", "assignments"].includes(
                                    module,
                                  ) && (
                                    <button
                                      className="btn secondary small"
                                      onClick={() => {
                                        setEditing(r);
                                        setShowForm(true);
                                        window.scrollTo({
                                          top: 0,
                                          behavior: "smooth",
                                        });
                                      }}
                                    >
                                      <Pencil size={13} />
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    className="btn danger small"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          "Delete this record? Related academic history will prevent unsafe deletions.",
                                        )
                                      )
                                        act(module, "DELETE", { id: r.id });
                                    }}
                                  >
                                    <Trash2 size={13} />
                                    Delete
                                  </button>
                                </div>
                              )}
                          </article>
                        ))}
                  </div>
                )}

                {Array.isArray(data) && (
                  <div className="row mt-6">
                    <button
                      className="btn secondary small"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span className="footnote">Page {page}</span>
                    <button
                      className="btn secondary small"
                      disabled={data.length < 20}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )
      )}
    </>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <BookOpen size={26} className="mx-auto mb-3 text-slate-600" />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function GenericTable({ data }: { data: Row[] }) {
  return (
    <div className="card table-scroll">
      <h3 className="mb-5">Recent audit activity</h3>
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Resource</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td>{r.action}</td>
              <td>{r.resource}</td>
              <td>{when(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordForm({
  module,
  fields,
  value,
  catalog,
  onSave,
  onCancel,
}: {
  module: string;
  fields: Field[];
  value: Row | null;
  catalog: Row;
  onSave: (body: Row) => Promise<void>;
  onCancel: () => void;
}) {
  const [imageId, setImageId] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [audioId, setAudioId] = useState(""),
    [busy, setBusy] = useState(false),
    [people, setPeople] = useState<Row>({}),
    [error, setError] = useState("");

  useEffect(() => {
    for (const source of ["students", "teachers"])
      if (
        fields.some((f) => f.source === source) &&
        source === "students" &&
        !catalog.students?.length
      )
        api(source)
          .then((d) => setPeople((p) => ({ ...p, [source]: d })))
          .catch((e) => setError(e.message));
  }, [fields]);

  const choices = (source: string) => {
    if (module === "class-records" && source === "teachers" && value?.teacher &&
      !catalog.teachers?.some((teacher: Row) => teacher.id === value.teacherId)) {
      return [...(catalog.teachers || []), { id: value.teacherId, name: value.teacher.name }];
    }
    return source === "chapters"
      ? (catalog.subjects || []).flatMap((s: Row) =>
          s.chapters.map((c: Row) => ({ ...c, name: `${s.name} / ${c.name}` })),
        )
      : people[source] || catalog[source] || [];
  };

  return (
    <form
      className="card form mb-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData(e.currentTarget);
        const body: Row = {};
        for (const f of fields) {
          let v: any = fd.get(f.key);
          if (f.type === "number") v = Number(v);
          if (f.type === "datetime-local") v = new Date(v).toISOString();
          body[f.key] = v;
        }
        if (value) body.id = value.id;
        if (audioId) body.audioId = audioId;
        if (imageId) body.imageId = imageId;
        try {
          await onSave(body);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="row">
        <h3>{module === "class-records" ? (value ? "Edit class record" : "Add class record") : value ? "Edit record" : "Add " + module}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="btn secondary small"
        >
          Cancel
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="grid two">
        {fields.map((f) => (
          <label className="label" key={f.key}>
            {f.label}
            {f.source || f.options ? (
              <select
                aria-label={f.label}
                className="input"
                name={f.key}
                required
                defaultValue={value?.[f.key] || (f.key === "payment" ? "Unpaid" : "")}
              >
                <option value="" disabled>
                  Choose {f.label.toLowerCase()}
                </option>
                {(
                  f.options?.map((v) => ({ id: v, name: v })) ||
                  choices(f.source!)
                ).map((v: Row) => (
                  <option value={v.id} key={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                aria-label={f.label}
                className="input"
                name={f.key}
                defaultValue={value?.[f.key] || ""}
                required={f.required !== false}
                maxLength={10000}
              />
            ) : (
              <input
                aria-label={f.label}
                className="input"
                type={f.type === "money" ? "number" : f.type || "text"}
                name={f.key}
                defaultValue={
                  value?.[f.key]
                    ? f.type === "datetime-local"
                      ? new Date(
                          new Date(value[f.key]).getTime() -
                            new Date().getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : value[f.key]
                    : f.type === "date"
                      ? dhakaDate()
                      : f.type === "number"
                        ? 0
                        : ""
                }
                required={f.required !== false}
                minLength={f.type === "password" ? 12 : undefined}
                min={f.type === "number" || f.type === "money" ? 0 : undefined}
                max={f.type === "money" ? 1000000 : undefined}
                step={f.type === "money" ? "0.01" : undefined}
              />
            )}
          </label>
        ))}
      </div>
      {module === "questions" && (
        <>
          <VoiceRecorder onUploaded={setAudioId} />
          <ImageAttachment
            onUploaded={setImageId}
            onBusyChange={setImageBusy}
          />
        </>
      )}
      <button className="btn justify-self-start" disabled={busy || imageBusy}>
        {busy
          ? "Saving…"
          : "Save " + (module === "revision" ? "topic" : "record")}
      </button>
    </form>
  );
}

function ReplyForm({
  voice,
  onSave,
}: {
  voice?: boolean;
  onSave: (body: Row) => Promise<boolean>;
}) {
  const [audioId, setAudioId] = useState(""),
    [busy, setBusy] = useState(false),
    [recorderKey, setRecorderKey] = useState(0);
  return (
    <form
      className="form mt-5 border-t border-slate-100 pt-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        setBusy(true);
        try {
          if (
            await onSave({
              text: new FormData(f).get("text"),
              ...(audioId ? { audioId } : {}),
            })
          ) {
            f.reset();
            setAudioId("");
            setRecorderKey((k) => k + 1);
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="label">
        Your reply
        <textarea
          className="input"
          name="text"
          required={!audioId}
          maxLength={10000}
        />
      </label>
      {voice && <VoiceRecorder key={recorderKey} onUploaded={setAudioId} />}
      <button className="btn small justify-self-start" disabled={busy}>
        {busy ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}

function Profile({
  data,
  isTeacher,
  save,
}: {
  data: Row;
  isTeacher: boolean;
  save: (body: Row) => Promise<boolean>;
}) {
  const [image, setImage] = useState(data.hasAvatar ? "/api/avatar" : ""),
    [uploadStatus, setUploadStatus] = useState("");
  const accountDetails = isTeacher
    ? [
        ["Teacher ID", data.teacherCode || "Unassigned"],
        ["Email", data.email],
        [
          "Join date",
          new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeZone: "Asia/Dhaka",
          }).format(new Date(data.createdAt)),
        ],
      ]
    : [
        ["Email", data.email],
        ["Student ID", data.studentCode],
        ["Class", data.className],
        ["Group", data.group],
        ["Role", data.role],
        ["Guardian", data.guardianName],
        ["Guardian contact", data.guardianContact],
        ["Admission", when(data.createdAt)],
      ];
  return (
    <div className="grid two profile-details">
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await save({
            name: f.get("name"),
            phone: f.get("phone"),
            school: f.get("school"),
            bloodGroup: f.get("bloodGroup"),
            ...(!isTeacher && { emailReminders: f.get("emailReminders") === "on" }),
          });
        }}
      >
        <h3>Personal information</h3>
        <div className="flex profile-photo-field">
          {image && (
            <img
              src={image}
              alt="Your profile"
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <label className="label">
            Profile photo (PNG, JPEG or WebP, up to 2 MB)
            <input
              className="input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append("image", file);
                setUploadStatus("Uploading…");
                try {
                  const res = await fetch("/api/avatar", {
                    method: "POST",
                    body: form,
                  });
                  const result = await res.json();
                  if (!res.ok) throw new Error(result.error);
                  const avatar = "/api/avatar?t=" + Date.now();
                  setImage(avatar);
                  window.dispatchEvent(new CustomEvent("profile-updated", { detail: { avatar } }));
                  setUploadStatus("Photo saved.");
                } catch (e) {
                  setUploadStatus((e as Error).message);
                }
              }}
            />
          </label>
        </div>
        {uploadStatus && (
          <p role="status" className="footnote">
            {uploadStatus}
          </p>
        )}
        {[
          { field: "name", label: "Name", maxLength: 500 },
          { field: "phone", label: isTeacher ? "Phone number" : "Phone", maxLength: 30 },
          {
            field: "school",
            label: isTeacher ? "Educational institution or current job title" : "School",
            maxLength: 200,
          },
        ].map(({ field, label, maxLength }) => (
          <label className="label" key={field}>
            {label}
            <input
              className="input"
              name={field}
              type={field === "phone" ? "tel" : "text"}
              defaultValue={data[field] || ""}
              required={field === "name"}
              maxLength={maxLength}
            />
          </label>
        ))}
        <label className="label">Blood group
          <select className="input" aria-label="Blood group" name="bloodGroup" defaultValue={data.bloodGroup || ""}>
            <option value="">Not specified</option>
            {BLOOD_GROUPS.map((group) => <option key={group}>{group}</option>)}
          </select>
        </label>
        {!isTeacher && (
          <label className="flex">
            <input
              name="emailReminders"
              type="checkbox"
              defaultChecked={data.emailReminders}
            />
            Email revision reminders
          </label>
        )}
        <button className="btn">Save profile</button>
      </form>
      <div className="card stack">
        <h3>{isTeacher ? "Account details" : "Account & academic details"}</h3>
        {accountDetails.map(([k, v]) => (
          <div className="row" key={k}>
            <span className="muted">{k}</span>
            <strong>{v || "—"}</strong>
          </div>
        ))}
        {isTeacher && (
          <section className="stack" aria-labelledby="profile-subjects-heading">
            <h3 id="profile-subjects-heading">My Subjects</h3>
            {data.subjects?.length ? (
              <ul className="list-disc pl-5">
                {data.subjects.map((subject: { id: string; name: string }) => (
                  <li key={subject.id}>{subject.name}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No subjects assigned yet.</p>
            )}
          </section>
        )}
        <p className="footnote">
          Academic fields are managed by your administrator.
        </p>
        <Link className="btn secondary" href="/forgot-password">
          Reset password securely
        </Link>
      </div>
      {data.role === "STUDENT" && <StudentBilling />}
    </div>
  );
}

function AttendanceForm({
  catalog,
  save,
}: {
  catalog: Row;
  save: (body: Row) => Promise<boolean>;
}) {
  const [batch, setBatch] = useState(""),
    [students, setStudents] = useState<Row[]>([]),
    [error, setError] = useState("");
  return (
    <details className="card mb-5">
      <summary>Record class attendance</summary>
      <form
        className="form mt-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await save({
            batchId: batch,
            date: f.get("date"),
            records: students.map((s) => ({
              userId: s.id,
              present: f.get(s.id) === "on",
            })),
          });
        }}
      >
        <div className="grid two">
          <label className="label">
            Batch
            <select
              className="input"
              required
              value={batch}
              onChange={async (e) => {
                const id = e.target.value;
                setBatch(id);
                try {
                  const rows = await api(
                    "students?batchId=" + encodeURIComponent(id),
                  );
                  setStudents(rows);
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <option value="">Choose a batch</option>
              {catalog.batches?.map((b: Row) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Date
            <input
              className="input"
              type="date"
              name="date"
              defaultValue={dhakaDate()}
              required
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <p className="footnote">
          Checked = present. Unchecked = absent. Existing records for the date
          are updated.
        </p>
        <div className="grid two">
          {students.map((s) => (
            <label className="flex" key={s.id}>
              <input name={s.id} type="checkbox" defaultChecked />
              {s.name}
            </label>
          ))}
        </div>
        <button className="btn justify-self-start" disabled={!students.length}>
          Save attendance
        </button>
      </form>
    </details>
  );
}

function ExamEditor({
  catalog,
  value,
  onSave,
}: {
  catalog: Row;
  value: Row | null;
  onSave: (body: Row) => Promise<void>;
}) {
  const [questions, setQuestions] = useState<
      {
        text: string;
        marks: number;
        options: string[];
        correctOption: number;
      }[]
    >(
      value?.questions || [
        { text: "", marks: 1, options: ["", "", "", ""], correctOption: 0 },
      ],
    ),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="card form mb-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          await onSave({
            ...(value ? { id: value.id } : {}),
            title: f.get("title"),
            batchId: f.get("batchId"),
            chapterId: f.get("chapterId"),
            durationMinutes: Number(f.get("durationMinutes")),
            attemptLimit: Number(f.get("attemptLimit")),
            startsAt: new Date(String(f.get("startsAt"))).toISOString(),
            endsAt: new Date(String(f.get("endsAt"))).toISOString(),
            releaseAt: new Date(String(f.get("releaseAt"))).toISOString(),
            published: f.get("published") === "on",
            questions,
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{value ? "Edit chapter exam" : "Create chapter exam"}</h3>
      <div className="grid two">
        <label className="label">
          Exam title
          <input
            name="title"
            className="input"
            defaultValue={value?.title}
            required
          />
        </label>
        <label className="label">
          Batch
          <select
            name="batchId"
            className="input"
            defaultValue={value?.batchId}
            required
          >
            {catalog.batches?.map((b: Row) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Chapter
          <select
            name="chapterId"
            className="input"
            defaultValue={value?.chapterId}
            required
          >
            {catalog.subjects?.flatMap((s: Row) =>
              s.chapters.map((c: Row) => (
                <option key={c.id} value={c.id}>
                  {s.name} / {c.name}
                </option>
              )),
            )}
          </select>
        </label>
        <label className="label">
          Duration (minutes)
          <input
            className="input"
            name="durationMinutes"
            type="number"
            min="1"
            max="180"
            defaultValue={value?.durationMinutes || 30}
            required
          />
        </label>
        <label className="label">
          Attempt limit
          <input
            className="input"
            name="attemptLimit"
            type="number"
            min="1"
            max="5"
            defaultValue={value?.attemptLimit || 1}
            required
          />
        </label>
        {["startsAt", "endsAt", "releaseAt"].map((k) => (
          <label className="label" key={k}>
            {k === "startsAt"
              ? "Opens"
              : k === "endsAt"
                ? "Closes"
                : "Results released"}{" "}
            (device time)
            <input
              className="input"
              type="datetime-local"
              name={k}
              defaultValue={
                value?.[k]
                  ? new Date(
                      new Date(value[k]).getTime() -
                        new Date().getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .slice(0, 16)
                  : undefined
              }
              required
            />
          </label>
        ))}
      </div>
      {questions.map((q, i) => (
        <div className="card form" key={i}>
          <div className="row">
            <h4>Question {i + 1}</h4>
            {questions.length > 1 && (
              <button
                type="button"
                className="btn danger small"
                onClick={() =>
                  setQuestions((list) => list.filter((_, n) => n !== i))
                }
              >
                Remove
              </button>
            )}
          </div>
          <input
            aria-label={`Question ${i + 1}`}
            className="input"
            required
            value={q.text}
            onChange={(e) =>
              setQuestions((list) =>
                list.map((v, n) =>
                  n === i ? { ...v, text: e.target.value } : v,
                ),
              )
            }
          />
          <div className="grid two">
            {q.options.map((opt, j) => (
              <label className="label" key={j}>
                Option {j + 1}
                <input
                  className="input"
                  required
                  value={opt}
                  onChange={(e) =>
                    setQuestions((list) =>
                      list.map((v, n) =>
                        n === i
                          ? {
                              ...v,
                              options: v.options.map((o, k) =>
                                k === j ? e.target.value : o,
                              ),
                            }
                          : v,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <div className="grid two">
            <label className="label">
              Correct option
              <select
                className="input"
                value={q.correctOption}
                onChange={(e) =>
                  setQuestions((list) =>
                    list.map((v, n) =>
                      n === i
                        ? { ...v, correctOption: Number(e.target.value) }
                        : v,
                    ),
                  )
                }
              >
                {q.options.map((_, j) => (
                  <option key={j} value={j}>
                    Option {j + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="label">
              Marks
              <input
                className="input"
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                required
                value={q.marks}
                onChange={(e) =>
                  setQuestions((list) =>
                    list.map((v, n) =>
                      n === i ? { ...v, marks: Number(e.target.value) } : v,
                    ),
                  )
                }
              />
            </label>
          </div>
        </div>
      ))}
      <div className="flex">
        <button
          type="button"
          className="btn secondary small"
          onClick={() =>
            setQuestions((list) => [
              ...list,
              {
                text: "",
                marks: 1,
                options: ["", "", "", ""],
                correctOption: 0,
              },
            ])
          }
        >
          Add question
        </button>
        <label className="flex">
          <input
            type="checkbox"
            name="published"
            defaultChecked={value?.published}
          />
          Publish immediately
        </label>
      </div>
      <button className="btn justify-self-start" disabled={busy}>
        {busy ? "Saving…" : "Save examination"}
      </button>
    </form>
  );
}

function exportCsv(data: Row[]) {
  const rows = [
    ["Date", "Batch", "Student", "Present"],
    ...data.flatMap((s) =>
      s.records.map((r: Row) => [
        s.date,
        s.batch.name,
        r.user.name,
        r.present ? "Yes" : "No",
      ]),
    ),
  ];
  const csv = rows
    .map((row) =>
      row
        .map(
          (v: string) =>
            '"' +
            String(v)
              .replace(/^[=+@-]/, "'$&")
              .replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "spark-academy-attendance.csv";
  a.click();
  URL.revokeObjectURL(url);
}
