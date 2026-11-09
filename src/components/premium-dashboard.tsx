"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Layers3,
  Users,
  Bell,
  ArrowRight,
} from "lucide-react";
import { PerformanceChart } from "./charts";
type Row = Record<string, any>;
type Role = "STUDENT" | "TEACHER" | "ADMIN";
export function PremiumDashboard({
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
  const student = role === "STUDENT";
  const links = student
    ? [
        ["lessons", "Continue learning", BookOpen],
        ["exams", "Chapter exams", ClipboardCheck],
        ["revision", "Revision planner", Clock],
      ]
    : role === "TEACHER"
      ? [
          ["lessons", "Manage lessons", BookOpen],
          ["exams", "Exam management", ClipboardCheck],
          ["attendance", "Class attendance", CalendarDays],
        ]
      : [
          ["students", "Manage students", Users],
          ["batches", "Manage batches", Layers3],
          ["reports", "Academy reports", ClipboardCheck],
        ];
  const metrics = [
    {
      label: student
        ? "Study progress"
        : role === "ADMIN"
          ? "Total students"
          : "Assigned students",
      value: student ? `${data.progress}%` : (data.students ?? 0),
      icon: student ? BookOpen : Users,
      path: student ? "progress" : role === "ADMIN" ? "students" : "batches",
      note: student
        ? "Assigned lesson completion"
        : "Across your academic workspace",
    },
    {
      label: "Available exams",
      value: data.exams,
      icon: ClipboardCheck,
      path: "exams",
      note: "Published examinations",
    },
    {
      label: "Attendance",
      value: `${data.attendance}%`,
      icon: CalendarDays,
      path: "attendance",
      note: "Based on recorded classes",
    },
    {
      label: student ? "Revisions due" : "Average exam score",
      value: student ? data.revisions : `${data.average}%`,
      icon: student ? Clock : GraduationCap,
      path: student ? "revision" : "results",
      note: student ? "Today and overdue" : "Released examination results",
    },
  ];
  const upcoming = (catalog.routines || [])
    .filter((r: Row) => new Date(r.endsAt) > new Date())
    .slice(0, 3);
  const results = (catalog.results || [])
    .slice(0, 8)
    .reverse()
    .map((r: Row, i: number) => ({
      label: `A${i + 1}`,
      title: r.title,
      percentage: r.percentage,
    }));
  const date = new Date().toLocaleDateString("en-GB", {
    timeZone: "Asia/Dhaka",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="premium-dashboard">
      <section className="premium-welcome">
        <div className="welcome-copy">
          <div className="welcome-meta">
            <span className="welcome-dot" />
            SPARK ACADEMY · {role} PORTAL
          </div>
          <h2>
            {student
              ? "A clear path to your next achievement."
              : role === "TEACHER"
                ? "Your classroom, thoughtfully organized."
                : "Your academy. A complete perspective."}
          </h2>
          <p>
            {student
              ? `Good to see you, ${name.split(" ")[0]}. Your lessons, assessments and revision plan are ready.`
              : role === "TEACHER"
                ? "Bring lessons, assessments and learner support together in one focused workspace."
                : "Oversee people, academic activity and outcomes with the clarity to make better decisions."}
          </p>
          <div className="welcome-bottom">
            <span>
              <CalendarDays size={14} />
              {date} · Dhaka
            </span>
            <Link
              href={`${base}/${student ? "lessons" : role === "TEACHER" ? "batches" : "reports"}`}
            >
              Open your workspace <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <div className="welcome-emblem" aria-hidden="true">
          <div className="emblem-ring">
            <GraduationCap size={58} strokeWidth={1} />
          </div>
          <span>LEARN · GROW · SHINE</span>
        </div>
      </section>
      <div className="premium-metrics">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <article className="metric-panel" key={m.label}>
              <div className="metric-top">
                <span className={`metric-icon tone-${i}`}>
                  <Icon size={20} />
                </span>
                <Link aria-label={`View ${m.label}`} href={`${base}/${m.path}`}>
                  <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="metric-value">{m.value}</div>
              <h3>{m.label}</h3>
              <p>{m.note}</p>
            </article>
          );
        })}
      </div>
      <nav className="dashboard-shortcuts" aria-label="Dashboard quick actions">
        <span>QUICK ACCESS</span>
        {links.map(([path, label, Icon]) => {
          const I = Icon as typeof BookOpen;
          return (
            <Link key={String(path)} href={`${base}/${path}`}>
              <I size={16} />
              {String(label)}
              <ArrowUpRight size={14} />
            </Link>
          );
        })}
      </nav>
      <div className="premium-main-grid">
        <section className="card performance-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">LEARNING INSIGHTS</span>
              <h3>Academic performance</h3>
            </div>
            <span className="panel-badge">Released results</span>
          </div>
          <div className="performance-summary">
            <strong>
              {data.average}
              <small>%</small>
            </strong>
            <div>
              Average score<p>Based on saved examination results</p>
            </div>
          </div>
          {results.length ? (
            <PerformanceChart data={results} />
          ) : (
            <div className="premium-empty">
              <ClipboardCheck size={28} />
              <h4>Your performance story starts here.</h4>
              <p>Released exam results will build your assessment history.</p>
            </div>
          )}
          <div className="panel-footer">
            <span>Assessment history · most recent results</span>
            <Link href={`${base}/results`}>
              Explore results <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
        <section className="card schedule-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">YOUR ACADEMIC CALENDAR</span>
              <h3>Upcoming classes</h3>
            </div>
            <CalendarDays size={19} />
          </div>
          {upcoming.length ? (
            upcoming.map((r: Row) => {
              const d = new Date(r.startsAt);
              return (
                <article className="schedule-entry" key={r.id}>
                  <div className="schedule-date">
                    <strong>
                      {d.toLocaleDateString("en-GB", {
                        timeZone: "Asia/Dhaka",
                        day: "2-digit",
                      })}
                    </strong>
                    <span>
                      {d.toLocaleDateString("en-GB", {
                        timeZone: "Asia/Dhaka",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div>
                    <h4>{r.subject}</h4>
                    <p>{r.location}</p>
                    <span>
                      {d.toLocaleTimeString("en-GB", {
                        timeZone: "Asia/Dhaka",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · Asia/Dhaka
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="premium-empty">
              <CalendarDays size={28} />
              <h4>No upcoming classes.</h4>
              <p>Your next scheduled class will appear here.</p>
            </div>
          )}
          <Link className="schedule-link" href={`${base}/routines`}>
            View complete routine <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
      <div className="premium-bottom-grid">
        <section className="card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">PREPARE WITH PURPOSE</span>
              <h3>Examinations</h3>
            </div>
            <Link href={`${base}/exams`} aria-label="View examinations">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {(catalog.exams || []).slice(0, 3).map((e: Row, i: number) => (
            <Link className="assessment-row" key={e.id} href={`${base}/exams`}>
              <span className="assessment-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h4>{e.title}</h4>
                <p>
                  {e.durationMinutes} minutes <span>·</span>{" "}
                  {e._count.questions} questions
                </p>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          ))}
          {!catalog.exams?.length && (
            <p className="premium-placeholder">
              Your assigned examinations will appear here.
            </p>
          )}
        </section>
        <section className="card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">STAY INFORMED</span>
              <h3>Latest updates</h3>
            </div>
            <Bell size={18} />
          </div>
          {(catalog.notifications || []).slice(0, 3).map((n: Row) => (
            <Link
              className="update-row"
              key={n.id}
              href={`${base}/notifications`}
            >
              <span className={`update-dot ${n.readAt ? "read" : ""}`} />
              <div>
                <h4>{n.title}</h4>
                <p>{n.message}</p>
              </div>
            </Link>
          ))}
          {!catalog.notifications?.length && (
            <p className="premium-placeholder">
              You are up to date. New announcements will appear here.
            </p>
          )}
          <Link className="all-updates" href={`${base}/notifications`}>
            Notification centre <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
    </div>
  );
}
