"use client";

import { useEffect, useState } from "react";
import { ClipboardList, MessagesSquare, Wallet } from "lucide-react";
import type { readTeacherPayments } from "@/services/teacher-payments";
import styles from "./teacher-payments.module.css";

type Ledger = NonNullable<Awaited<ReturnType<typeof readTeacherPayments>>>;
type Teacher = { id: string; name: string; teacherCode: string | null };

const taka = new Intl.NumberFormat("en-BD", {
  style: "currency", currency: "BDT", currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});
const money = (minor: number) => taka.format(minor / 100);
const dateLabel = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...init });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load payments");
  return result.data;
}

function PaymentLedger({ teacherId }: { teacherId?: string }) {
  const endpoint = "/api/teacher-payments";
  const url = teacherId ? `${endpoint}?teacherId=${encodeURIComponent(teacherId)}` : endpoint;
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [attempt, setAttempt] = useState(0);
  const dueShare = ledger?.totalMinor ? ledger.dueMinor / ledger.totalMinor * 100 : 0;

  useEffect(() => {
    const controller = new AbortController();
    request(url, { signal: controller.signal })
      .then(setLedger)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [url, attempt]);

  async function changeStatus(item: Ledger["items"][number]) {
    setSaving(item.id);
    setError("");
    try {
      await request(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, kind: item.kind, paid: !item.paid }),
      });
      setLedger(await request(url));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving("");
    }
  }

  return (
    <>
      {error && (
        <div className="error row" role="alert">
          {error}
          <button type="button" className="underline" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Refresh</button>
        </div>
      )}
      {!ledger && !error && <p role="status">Loading payments…</p>}
      {ledger && (
        <>
          <section className={styles.overview} aria-labelledby="teacher-payment-overview">
            <div className={styles.total}>
              <h2 id="teacher-payment-overview">Payment overview</h2>
              <span>Still due</span>
              <strong>{money(ledger.dueMinor)}</strong>
            </div>
            <div className={styles.balance}>
              <div className={styles.balanceAmounts}>
                <div><span>Total payable</span><strong>{money(ledger.totalMinor)}</strong></div>
                <div><span>Total paid</span><strong>{money(ledger.paidMinor)}</strong></div>
              </div>
              {ledger.totalMinor > 0 && (
                <div className={styles.progressGroup}>
                  <div className={styles.progress} aria-hidden="true">
                    <span style={{ inlineSize: `${dueShare}%` }} />
                  </div>
                  <div className={styles.progressLabels}>
                    <span>Still due · {Math.round(dueShare)}%</span>
                    <span>Paid · {100 - Math.round(dueShare)}%</span>
                  </div>
                </div>
              )}
            </div>
          </section>
          <section className={styles.panel} aria-labelledby="teacher-payment-breakdown">
            <h2 className={styles.panelHeading} id="teacher-payment-breakdown">Earnings breakdown</h2>
            <div className={styles.earningRows}>
              <div className={styles.earning}>
                <ClipboardList className={styles.activityIcon} size={18} strokeWidth={1.5} aria-hidden="true" />
                <div><h3>Classes taken</h3><p>{ledger.classCount} {ledger.classCount === 1 ? "class" : "classes"}</p></div>
                <strong>{money(ledger.classTotalMinor)}</strong>
              </div>
              <div className={styles.earning}>
                <MessagesSquare className={styles.activityIcon} size={18} strokeWidth={1.5} aria-hidden="true" />
                <div><h3>Q&A solved</h3><p>{ledger.answerCount} × {money(ledger.answerRate)}</p></div>
                <strong>{money(ledger.answerCount * ledger.answerRate)}</strong>
              </div>
            </div>
          </section>
          <section className={styles.panel} aria-labelledby="teacher-payment-details">
            <h2 className={styles.panelHeading} id="teacher-payment-details">Payment details</h2>
            {ledger.items.length ? (
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Itemized teacher payments">
                <table className={styles.table}>
                  <thead><tr><th>Date</th><th>Activity</th><th>Amount</th><th>Status</th>{teacherId && <th>Action</th>}</tr></thead>
                  <tbody>
                    {ledger.items.map((item) => (
                      <tr key={`${item.kind}-${item.id}`}>
                        <td>{dateLabel.format(new Date(item.date + "T00:00:00Z"))}</td>
                        <td>{item.kind === "qna" ? `Q&A · ${item.title}` : item.title}</td>
                        <td>{money(item.amountMinor)}</td>
                        <td><span className={styles.status} data-paid={item.paid}>{item.paid ? "Paid" : "Unpaid"}</span></td>
                        {teacherId && <td>
                          <button type="button" className="btn secondary small" disabled={!!saving} onClick={() => changeStatus(item)}>
                            {saving === item.id ? "Saving…" : item.paid ? "Mark unpaid" : "Mark paid"}
                          </button>
                        </td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className={styles.empty}><Wallet size={18} strokeWidth={1.5} aria-hidden="true" />No completed classes or credited Q&A answers yet.</p>}
          </section>
        </>
      )}
    </>
  );
}

export function TeacherPayments({ teachers }: { teachers?: Teacher[] }) {
  const [teacherId, setTeacherId] = useState("");
  return (
    <div className={styles.page}>
      <h1>{teachers ? "Teacher payments" : "Payments"}</h1>
      {teachers && (
        <label className={`label ${styles.teacherSelect}`}>
          Teacher
          <select className="input" value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
            <option value="">Select a teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}{teacher.teacherCode ? ` · ${teacher.teacherCode}` : ""}</option>
            ))}
          </select>
        </label>
      )}
      {(!teachers || teacherId) && <PaymentLedger key={teacherId} teacherId={teacherId || undefined} />}
    </div>
  );
}
