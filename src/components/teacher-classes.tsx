"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dhakaDate } from "@/lib/domain";
import styles from "./teacher-classes.module.css";

type Batch = { id: string; name: string; className: string };
export type ClassRecord = {
  id: string;
  date: string;
  classNumber: number;
  batch: Pick<Batch, "name" | "className">;
  subject: { name: string };
  adminComment: string;
  paid: boolean;
};

const shortDate = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const monthLabel = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const asDate = (date: string) => new Date(date + "T00:00:00Z");

export function ClassRecordDetails({
  record,
  collapseComment = false,
}: {
  record: ClassRecord;
  collapseComment?: boolean;
}) {
  return (
    <div className="stack">
      <div className="row">
        <h3>Class {record.classNumber} · {record.subject.name}</h3>
        <span className={record.paid ? "status" : "status text-amber-800"} data-payment={record.paid ? "paid" : "unpaid"}>
          {record.paid ? "Paid" : "Unpaid"}
        </span>
      </div>
      <p>{shortDate.format(asDate(record.date))} · {record.batch.name} · {record.batch.className}</p>
      {collapseComment && record.adminComment ? (
        <details className={styles.comment}>
          <summary>Admin comments</summary>
          <p className="whitespace-pre-wrap break-words">{record.adminComment}</p>
        </details>
      ) : (
        <div>
          {!collapseComment && <strong>Admin comments</strong>}
          <p className="whitespace-pre-wrap break-words">{record.adminComment || "No comments yet."}</p>
        </div>
      )}
    </div>
  );
}

export function TeacherClasses({ records, batches }: { records: ClassRecord[]; batches: Batch[] }) {
  const today = dhakaDate();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState("");
  const [payment, setPayment] = useState("all");
  const first = asDate(month + "-01");
  const start = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const byDate = new Map<string, ClassRecord[]>();
  for (const record of records) {
    if (!record.date.startsWith(month)) continue;
    const dayRecords = byDate.get(record.date) || [];
    dayRecords.push(record);
    byDate.set(record.date, dayRecords);
  }
  const paid = records.filter((record) => record.paid).length;
  const visible = records.filter((record) =>
    (!selectedDate || record.date === selectedDate) &&
    (payment === "all" || record.paid === (payment === "paid")),
  );

  function moveMonth(offset: number) {
    const next = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + offset, 1));
    setMonth(next.toISOString().slice(0, 7));
    setSelectedDate("");
  }

  return (
    <div className={styles.register}>
      <section className={styles.panel} aria-labelledby="class-calendar-heading">
        <div className={styles.header}>
          <h2 id="class-calendar-heading">Class calendar</h2>
          <div className={styles.monthControl}>
            <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
            <strong aria-live="polite">{monthLabel.format(first)}</strong>
            <button type="button" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={16} aria-hidden="true" /></button>
          </div>
        </div>
          <div className={styles.calendar}>
            {weekdays.map((day) => <div key={day} className={styles.weekday}>{day}</div>)}
            {Array.from({ length: start }, (_, index) => <div key={`blank-${index}`} className={styles.blank} aria-hidden="true" />)}
            {Array.from({ length: days }, (_, index) => {
              const date = `${month}-${String(index + 1).padStart(2, "0")}`;
              const classes = byDate.get(date) || [];
              return (
                <div key={date} className={styles.day}>
                  {classes.length ? (
                    <button
                      type="button"
                      className={styles.taughtDay}
                      aria-pressed={selectedDate === date}
                      aria-current={date === today ? "date" : undefined}
                      aria-label={`${shortDate.format(asDate(date))}, ${classes.length} ${classes.length === 1 ? "class" : "classes"}: ${classes.map((record) => `class ${record.classNumber}`).join(", ")}`}
                      onClick={() => {
                        setSelectedDate(selectedDate === date ? "" : date);
                        setPayment("all");
                      }}
                    >
                      <span className={styles.dayNumber}>{index + 1}</span>
                      <span className={styles.dayCount}>{classes.length}</span>
                    </button>
                  ) : <span className={styles.dayNumber} aria-current={date === today ? "date" : undefined}>{index + 1}</span>}
                </div>
              );
            })}
            {Array.from({ length: (7 - (start + days) % 7) % 7 }, (_, index) => (
              <div key={`end-${index}`} className={styles.blank} aria-hidden="true" />
            ))}
          </div>
      </section>

      <section className={`${styles.panel} ${styles.history}`} aria-labelledby="class-history-heading">
        <div className={styles.header}>
        <h2 id="class-history-heading">Classes taken</h2>
        <div className={styles.filters} role="group" aria-label="Filter classes by payment status">
          {[
            { key: "all", label: "All classes", count: records.length },
            { key: "paid", label: "Paid", count: paid },
            { key: "unpaid", label: "Unpaid", count: records.length - paid },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              className={styles.filter}
              aria-pressed={payment === key && !selectedDate}
              onClick={() => { setSelectedDate(""); setPayment(key); }}
            >
              {label} <strong>{count}</strong>
            </button>
          ))}
        </div>
        </div>
        {selectedDate && <p className={styles.selectedDate}>Showing {shortDate.format(asDate(selectedDate))}</p>}
        {visible.length ? visible.map((record) => (
          <article key={record.id} className={styles.record}><ClassRecordDetails record={record} collapseComment /></article>
        )) : (
          <p className={styles.empty}>{payment === "unpaid" ? "No unpaid classes." : payment === "paid" ? "No paid classes." : "No completed classes recorded yet."}</p>
        )}
      </section>
      {batches.length > 0 && (
        <section className={styles.panel} aria-labelledby="assigned-classes-heading">
          <div className={styles.header}>
          <h2 id="assigned-classes-heading">Assigned classes</h2>
          </div>
          <ul className={styles.batches}>{batches.map((batch) => <li key={batch.id}>{batch.name} <span>{batch.className}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}
