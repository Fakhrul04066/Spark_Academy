"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
} from "lucide-react";
import { PerformanceChart } from "./charts";
import { dhakaDate } from "@/lib/domain";
import { moveDay, weekDays } from "@/lib/dashboard";

type Row = Record<string, any>;
type Role = "STUDENT" | "TEACHER" | "ADMIN";
const number = (value: number) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value);
const dayLabel = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: "Asia/Dhaka",
  }).format(new Date(day + "T12:00:00+06:00"));
const time = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

async function readPage(
  resource: string,
  signal?: AbortSignal,
): Promise<Row[]> {
  const response = await fetch("/api/" + resource, {
    cache: "no-store",
    signal,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Could not load these records");
  return result.data;
}
function PanelHeading({
  title,
  children,
  id,
}: {
  title: string;
  children?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="desk-panel-heading">
      <h2 id={id}>{title}</h2>
      {children}
    </div>
  );
}

export function StudyDashboard({
  role,
  name,
  data,
  catalog,
  base,
}: {
  role: Role;
  name: string;
  data: Row;
  catalog: Row;
  base: string;
}) {
  const student = role === "STUDENT",
    today = dhakaDate();
  const revisions: Row[] = (catalog.revisions || []).filter(
    (r: Row) => !r.completedAt && !r.cancelled,
  );
  const recent: Row[] = catalog.results || [];
  const scores = recent
    .slice(0, 8)
    .reverse()
    .map((r, index) => ({
      label: String(index + 1),
      title: r.title,
      percentage: r.percentage,
    }));
  const exams: Row[] = (catalog.exams || []).filter(
    (exam: Row) => exam.published && +new Date(exam.endsAt) >= Date.now(),
  );
  const summary = data.attendanceSummary || { total: 0, present: 0, absent: 0 };
  const metrics = [
    {
      label: student ? "Lessons completed" : "Students",
      value: student
        ? `${data.completedLessons} / ${data.lessons}`
        : number(data.students || 0),
      note: student
        ? "Across your enrolled courses"
        : "In your academic workspace",
      href: student
        ? "#learning-progress"
        : `${base}/${role === "ADMIN" ? "students" : "batches"}`,
    },
    {
      label: "Attendance",
      value: summary.total ? number(data.attendance) + "%" : "—",
      note: summary.total
        ? `${summary.present} of ${summary.total} recorded ${student ? "classes" : "student entries"}`
        : "No attendance recorded yet",
      href: "#dashboard-attendance",
    },
    {
      label: "Average score",
      value: data.resultCount ? number(data.average) + "%" : "—",
      note: data.resultCount
        ? `${number(data.resultCount)} released exam ${data.resultCount === 1 ? "result" : "results"}`
        : "Your released results appear here",
      href: "#exam-performance",
    },
    {
      label: student ? "Revisions to revisit" : "Available exams",
      value: number(student ? data.revisions : data.exams),
      note: student ? "Due today or earlier" : "Published and not yet closed",
      href: student ? "#revision-plan" : `${base}/exams`,
    },
  ];
  return (
    <div className="study-dashboard">
      <header className="desk-heading">
        <div>
          <p className="desk-context">
            {name}
            {catalog.batches?.length
              ? " · " + catalog.batches.map((b: Row) => b.name).join(", ")
              : " · Spark Academy"}
          </p>
          <h1>
            {student
              ? "Your study overview"
              : role === "TEACHER"
                ? "Your teaching day"
                : "Academy overview"}
          </h1>
          <p>
            {student
              ? "Your classes, attendance and progress, together."
              : "Classes, student attendance and academic progress, together."}
          </p>
        </div>
        <div className="desk-heading-actions">
          <span className="desk-current-date">
            <CalendarDays size={16} strokeWidth={1.5} />
            {dayLabel(today, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <Link
            className="desk-button"
            href={`${base}/${student ? (data.revisions ? "revision" : "lessons") : role === "ADMIN" ? "students" : "lessons"}`}
          >
            {student
              ? data.revisions
                ? "Review topics"
                : "Open lessons"
              : role === "ADMIN"
                ? "Manage students"
                : "Manage lessons"}
            <ArrowRight size={16} strokeWidth={1.5} />
          </Link>
        </div>
      </header>
      <div className="desk-overview" aria-label="Academic overview">
        {metrics.map((metric) => (
          <a href={metric.href} key={metric.label} className="desk-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </a>
        ))}
      </div>
      <div className="desk-main-grid">
        <DailyRoutine catalog={catalog} base={base} student={student} />
        <AttendanceOverview
          initial={catalog.attendance || []}
          summary={summary}
          percentage={data.attendance}
          student={student}
          base={base}
        />
      </div>
      <div className="desk-secondary-grid">
        <section
          className="desk-panel"
          id="learning-progress"
          aria-labelledby="progress-title"
        >
          <PanelHeading
            title={student ? "Learning progress" : "Academic progress"}
            id="progress-title"
          >
            <Link
              className="desk-text-link"
              href={`${base}/${student ? "lessons" : "results"}`}
            >
              {student ? "Open lessons" : "View results"}
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
          </PanelHeading>
          <p className="desk-description">
            {student
              ? "A subject-by-subject view of the lessons you have completed."
              : "Released exam scores across your assigned subjects."}
          </p>
          {catalog.progress?.length ? (
            <div className="desk-subjects">
              {catalog.progress.map((subject: Row) => {
                const value = student
                  ? subject.percentage
                  : subject.averageScore;
                return (
                  <div className="desk-subject" key={subject.subject}>
                    <div className="desk-subject-label">
                      <h3>{subject.subject}</h3>
                      <strong>
                        {value === null ? "—" : number(value) + "%"}
                      </strong>
                    </div>
                    <div
                      className="desk-progress-track"
                      role="progressbar"
                      aria-label={
                        subject.subject +
                        (student ? " lesson completion" : " average exam score")
                      }
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={value ?? 0}
                    >
                      <span
                        style={{
                          width: `${Math.min(100, Math.max(0, value ?? 0))}%`,
                        }}
                      />
                    </div>
                    <div className="desk-subject-meta">
                      <span>
                        {student
                          ? `${subject.completed} of ${subject.total} lessons completed`
                          : subject.averageScore === null
                            ? "No released exam results"
                            : "Average released score"}
                      </span>
                      <span>
                        {student
                          ? `${subject.completedChapters} of ${subject.chapters} chapters`
                          : `${subject.chapters} chapters`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="desk-empty">
              <BookOpen size={18} strokeWidth={1.5} />
              <h3>No course activity yet</h3>
              <p>Your subjects will appear when lessons are assigned.</p>
            </div>
          )}
        </section>
        <section
          className="desk-panel desk-revisions"
          id="revision-plan"
          aria-labelledby="revision-title"
        >
          <PanelHeading title="Revision plan" id="revision-title">
            <Link
              className="desk-text-link"
              href={`${base}/${role === "ADMIN" ? "revision-schedules" : role === "TEACHER" ? "results" : "revision"}`}
            >
              {role === "TEACHER" ? "View results" : "Open planner"}
            </Link>
          </PanelHeading>
          <p className="desk-description">
            {student
              ? "A little practice now makes the next lesson easier."
              : "Scheduled follow-ups from the revision tracker."}
          </p>
          {revisions.length ? (
            <ol className="desk-revision-list">
              {revisions.slice(0, 3).map((revision) => (
                <li key={revision.id}>
                  <span className="desk-revision-marker" aria-hidden="true" />
                  <div>
                    <h3>{revision.topic.name}</h3>
                    <p>
                      {revision.dueDate < today
                        ? "Overdue · "
                        : revision.dueDate === today
                          ? "Today · "
                          : "Due "}
                      {dayLabel(revision.dueDate, {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="desk-quiet-empty">
              No revisions scheduled. Your next review dates will appear here.
            </p>
          )}
        </section>
      </div>
      <div className="desk-main-grid">
        <section
          className="desk-panel"
          id="exam-performance"
          aria-labelledby="performance-title"
        >
          <PanelHeading title="Exam performance" id="performance-title">
            <Link href={`${base}/results`} className="desk-text-link">
              All results
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
          </PanelHeading>
          {scores.length ? (
            <>
              <div className="desk-score">
                <strong>
                  {number(data.average)}
                  <small>%</small>
                </strong>
                <span>
                  Average across {number(data.resultCount)} released results
                </span>
              </div>
              <PerformanceChart data={scores} />
              <p className="desk-chart-caption">
                Last {scores.length} released attempts, oldest to newest
              </p>
              <div className="desk-latest-results">
                {recent.slice(0, 2).map((result) => (
                  <Link href={`${base}/results`} key={result.id}>
                    <div>
                      <h3>{result.title}</h3>
                      <span>
                        {student
                          ? `Position #${result.position}`
                          : result.subject}
                      </span>
                    </div>
                    <strong>{number(result.percentage)}%</strong>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="desk-empty">
              <h3>Your results will build this picture</h3>
              <p>Once an exam result is released, you can track it here.</p>
            </div>
          )}
        </section>
        <section className="desk-panel" aria-labelledby="questions-title">
          <PanelHeading title="Recent Q&A" id="questions-title">
            <Link className="desk-text-link" href={`${base}/questions`}>
              Open Q&A
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
          </PanelHeading>
          <p className="desk-description">
            {student
              ? "Keep track of the questions you have asked."
              : "Recent questions in your academic workspace."}
          </p>
          {catalog.questions?.length ? (
            <div className="desk-question-list">
              {catalog.questions.slice(0, 3).map((question: Row) => (
                <Link href={`${base}/questions`} key={question.id}>
                  <h3>{question.topic}</h3>
                  <span
                    className={question.replies.length ? "desk-answered" : ""}
                  >
                    {question.replies.length ? "Answered" : "Awaiting a reply"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="desk-quiet-empty">
              No questions yet. Ask whenever you get stuck on a topic.
            </p>
          )}
        </section>
      </div>
      <section className="desk-panel" aria-labelledby="exams-title">
        <PanelHeading title="Examinations" id="exams-title">
          <Link href={`${base}/exams`} className="desk-text-link">
            All exams
            <ArrowRight size={16} strokeWidth={1.5} />
          </Link>
        </PanelHeading>
        {exams.length ? (
          <div className="desk-exams">
            {exams.slice(0, 3).map((exam) => (
              <Link href={`${base}/exams`} key={exam.id}>
                <h3>{exam.title}</h3>
                <p>
                  {exam.durationMinutes} minutes · {exam._count.questions}{" "}
                  questions
                </p>
                <span>
                  {+new Date(exam.startsAt) > Date.now()
                    ? "Opens " +
                      dayLabel(dhakaDate(new Date(exam.startsAt)), {
                        day: "numeric",
                        month: "short",
                      })
                    : "Available now"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="desk-quiet-empty">
            No open exams right now. Published exams will appear here when they
            are available.
          </p>
        )}
      </section>
    </div>
  );
}

function DailyRoutine({
  catalog,
  base,
  student,
}: {
  catalog: Row;
  base: string;
  student: boolean;
}) {
  const [selected, setSelected] = useState(dhakaDate()),
    [routines, setRoutines] = useState<Row[]>([]),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const select = (day: string) => {
    if (day) {
      setSelected(day);
      setPage(1);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    if (page === 1) {
      setRoutines([]);
      setHasMore(false);
    }
    readPage(`routines?date=${selected}&page=${page}`, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setRoutines((previous) =>
            page === 1 ? rows : [...previous, ...rows],
          );
          setHasMore(rows.length === 20);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selected, page, retry]);
  const today = dhakaDate();
  return (
    <section className="desk-panel desk-agenda" aria-labelledby="routine-title">
      <PanelHeading title="Daily class routine" id="routine-title">
        {!student && (
          <Link href={`${base}/routines`} className="desk-text-link">
            Manage routine
          </Link>
        )}
      </PanelHeading>
      <div className="desk-calendar-toolbar">
        <span>{dayLabel(selected, { month: "long", year: "numeric" })}</span>
        <div>
          <button
            type="button"
            className="desk-today"
            onClick={() => select(today)}
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => select(moveDay(selected, -7))}
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => select(moveDay(selected, 7))}
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
          <label className="desk-date-picker">
            <CalendarDays size={16} strokeWidth={1.5} />
            <input
              type="date"
              aria-label="Routine date"
              onClick={(event) => event.currentTarget.showPicker?.()}
              value={selected}
              onChange={(e) => select(e.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="desk-week" aria-label="Choose a routine day">
        {weekDays(selected).map((day) => (
          <button
            type="button"
            key={day}
            className={day === selected ? "is-selected" : ""}
            aria-pressed={day === selected}
            aria-label={dayLabel(day, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            onClick={() => select(day)}
          >
            <span>{dayLabel(day, { weekday: "short" })}</span>
            <strong>{dayLabel(day, { day: "numeric" })}</strong>
            <i className={day === today ? "is-today" : ""} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="desk-agenda-caption">
        <h3>
          {selected === today
            ? "Today’s classes"
            : dayLabel(selected, {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
        </h3>
        <span>Dhaka time</span>
      </div>
      <div className="desk-agenda-content" aria-busy={loading}>
        {loading && !routines.length ? (
          <p className="desk-quiet-empty" role="status">
            Loading classes…
          </p>
        ) : error ? (
          <p className="desk-inline-error" role="alert">
            {error}{" "}
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Try again
            </button>
          </p>
        ) : routines.length ? (
          <ol className="desk-class-list">
            {routines.map((routine) => {
              const batch = catalog.batches?.find(
                  (b: Row) => b.id === routine.batchId,
                ),
                teacher = catalog.teachers?.find(
                  (t: Row) => t.id === routine.teacherId,
                );
              return (
                <li key={routine.id}>
                  <div className="desk-class-time">
                    <time dateTime={routine.startsAt}>
                      {time(routine.startsAt)}
                    </time>
                    <span>{time(routine.endsAt)}</span>
                  </div>
                  <div className="desk-class-info">
                    <h3>{routine.subject}</h3>
                    <p>
                      {[batch?.name, teacher?.name].filter(Boolean).join(" · ")}
                    </p>
                    <span>
                      <MapPin size={14} strokeWidth={1.5} />
                      {routine.location}
                    </span>
                  </div>
                  <span className="desk-class-state">
                    {+new Date(routine.endsAt) <= Date.now()
                      ? "Finished"
                      : +new Date(routine.startsAt) <= Date.now()
                        ? "In class"
                        : "Scheduled"}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="desk-agenda-empty">
            <CalendarDays size={18} strokeWidth={1.5} />
            <div>
              <h3>No classes on this day</h3>
              <p>
                {student
                  ? "There’s room for a lesson, a question, or a little revision."
                  : "Scheduled classes will appear here once a routine is added."}
              </p>
            </div>
          </div>
        )}
        {hasMore && !error && (
          <button
            type="button"
            className="desk-load-more"
            disabled={loading}
            onClick={() => setPage((value) => value + 1)}
          >
            {loading ? "Loading…" : "Load more classes"}
          </button>
        )}
      </div>
    </section>
  );
}

function AttendanceOverview({
  initial,
  summary,
  percentage,
  student,
  base,
}: {
  initial: Row[];
  summary: Row;
  percentage: number;
  student: boolean;
  base: string;
}) {
  const [records, setRecords] = useState(initial),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(initial.length === 20),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  return (
    <section
      className="desk-panel desk-attendance"
      id="dashboard-attendance"
      aria-labelledby="attendance-title"
    >
      <PanelHeading title="Attendance" id="attendance-title">
        {!student && (
          <Link href={`${base}/attendance`} className="desk-text-link">
            Record attendance
          </Link>
        )}
      </PanelHeading>
      <p className="desk-description">
        {student
          ? "Your recorded class attendance"
          : "Recorded attendance across your batches"}
      </p>
      <div className="desk-attendance-value">
        <strong>
          {summary.total ? number(percentage) : "—"}
          <small>{summary.total ? "%" : ""}</small>
        </strong>
        <span>
          {summary.total
            ? student
              ? `${summary.present} of ${summary.total} classes attended`
              : `${summary.present} of ${summary.total} student entries marked present`
            : "No records yet"}
        </span>
      </div>
      <div className="desk-attendance-bar" aria-hidden="true">
        <span style={{ width: `${summary.total ? percentage : 0}%` }} />
      </div>
      <div className="desk-attendance-counts">
        <div>
          <span className="desk-present-dot" />
          Present<strong>{summary.present}</strong>
        </div>
        <div>
          <span className="desk-absent-dot" />
          Absent<strong>{summary.absent}</strong>
        </div>
      </div>
      <details className="desk-attendance-history">
        <summary>
          Recent class records
          <ChevronRight size={16} strokeWidth={1.5} />
        </summary>
        {records.length ? (
          <ul>
            {records.map((session) => {
              const present = session.records.filter(
                  (r: Row) => r.present,
                ).length,
                marked = session.records.length;
              return (
                <li key={session.id}>
                  <div>
                    <strong>
                      {dayLabel(session.date, {
                        day: "numeric",
                        month: "short",
                      })}
                    </strong>
                    <span>{session.batch.name}</span>
                  </div>
                  <span
                    className={
                      student && marked
                        ? present
                          ? "desk-mark-present"
                          : "desk-mark-absent"
                        : "desk-mark-neutral"
                    }
                  >
                    {student ? (
                      marked ? (
                        present ? (
                          <>
                            <Check size={14} />
                            Present
                          </>
                        ) : (
                          <>
                            <Minus size={14} />
                            Absent
                          </>
                        )
                      ) : (
                        "Not marked"
                      )
                    ) : (
                      `${present}/${marked} present`
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="desk-quiet-empty">No attendance records to show</p>
        )}
        {error && (
          <p className="desk-inline-error" role="alert">
            {error}
          </p>
        )}
        {hasMore && (
          <button
            type="button"
            className="desk-load-more"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                const rows = await readPage(`attendance?page=${page + 1}`);
                setRecords((previous) => [...previous, ...rows]);
                setPage(page + 1);
                setHasMore(rows.length === 20);
              } catch (error) {
                setError((error as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Loading…" : "Load older records"}
          </button>
        )}
      </details>
      <p className="desk-attendance-note">
        {student
          ? "Attendance is updated by your teacher after class."
          : "Open class attendance to add or correct a record."}
      </p>
    </section>
  );
}
