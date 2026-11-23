"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dhakaDate } from "@/lib/domain";

type Fee = { id: string; title: string; amountMinor: number; paidMinor: number; dueMinor: number; dueDate: string };
type Payment = { id: string; title: string; amountMinor: number; paidAt: string; method: string; reference: string | null };
type Billing = { fees: Fee[]; payments: Payment[]; totalDueMinor: number; totalPaidMinor: number };
const money = (minor: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", currencyDisplay: "narrowSymbol" }).format(minor / 100);
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka",
}).format(new Date(value.length === 10 ? value + "T00:00:00+06:00" : value));

async function request(path: string, body?: unknown) {
  const response = await fetch("/api/" + path, body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load payment records");
  return result.data;
}

function useBilling(studentId?: string) {
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const result = await request("billing" + (studentId ? "?studentId=" + encodeURIComponent(studentId) : ""));
      if (current === sequence.current) setData(result);
    } catch (err) {
      if (current === sequence.current) { setData(null); setError((err as Error).message); }
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [studentId]);
  useEffect(() => { setData(null); refresh(); return () => { sequence.current++; }; }, [refresh]);
  return { data, error, loading, refresh };
}

function BillingSummary({ data }: { data: Billing }) {
  return (
    <div className="stack billing-summary">
      <section className="card stack" aria-labelledby="payment-overview-title">
        <h3 id="payment-overview-title">Payment overview</h3>
        <div className="grid two billing-totals">
          <div><span className="muted">Outstanding payment</span><strong>{data.fees.length ? money(data.totalDueMinor) : "—"}</strong></div>
          <div><span className="muted">Total paid</span><strong>{money(data.totalPaidMinor)}</strong></div>
        </div>
        {!data.fees.length ? <p>No fees have been added to your account yet.</p> : (
          <div className="table-scroll" role="region" aria-label="Fees and outstanding payments" tabIndex={0}>
            <table>
              <thead><tr><th>Fee</th><th>Due date</th><th>Amount</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead>
              <tbody>{data.fees.map((fee) => (
                <tr key={fee.id}>
                  <td>{fee.title}</td><td>{dateLabel(fee.dueDate)}</td><td>{money(fee.amountMinor)}</td>
                  <td>{money(fee.paidMinor)}</td><td><strong>{money(fee.dueMinor)}</strong></td>
                  <td><span className="pill">{!fee.dueMinor ? "Paid" : fee.dueDate < dhakaDate() ? "Overdue" : fee.paidMinor ? "Partially paid" : "Unpaid"}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {!!data.fees.length && <p className="footnote billing-scroll-hint">Swipe the table to see all fee details.</p>}
        <p className="footnote">Fees and received payments are recorded by the academy. Contact the admin if a record needs correction.</p>
      </section>
      <section className="card stack" aria-labelledby="payment-history-title">
        <h3 id="payment-history-title">Previous payments</h3>
        {!data.payments.length ? <p>No payments recorded yet.</p> : (
          <div className="table-scroll" role="region" aria-label="Previous payment details" tabIndex={0}>
            <table>
              <thead><tr><th>Paid on</th><th>Fee</th><th>Amount</th><th>Method</th><th>Reference</th><th>Receipt</th></tr></thead>
              <tbody>{data.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{dateLabel(payment.paidAt)}</td><td>{payment.title}</td><td><strong>{money(payment.amountMinor)}</strong></td>
                  <td>{payment.method}</td><td>{payment.reference || "—"}</td><td title={payment.id}>{payment.id}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {!!data.payments.length && <p className="footnote billing-scroll-hint">Swipe the table to see all payment details.</p>}
      </section>
    </div>
  );
}

export function StudentBilling() {
  const state = useBilling();
  return (
    <div className="profile-billing">
      {state.loading ? <p role="status" className="card">Loading payment details…</p> : state.error ? (
        <div role="alert" className="card error">{state.error} <button className="underline" onClick={state.refresh}>Retry</button></div>
      ) : state.data && <BillingSummary data={state.data} />}
    </div>
  );
}

export function BillingAdmin({ students }: { students: { id: string; name: string; studentCode: string | null; email: string }[] }) {
  const [student, setStudent] = useState("");
  return (
    <div className="stack">
      <div className="page-head"><span className="eyebrow">SPARK ACADEMY / ADMIN</span><h1>Student payments</h1><p>Add fees and record payments received by the academy.</p></div>
      <label className="label card">Student
        <select className="input" aria-label="Student" value={student} onChange={(e) => setStudent(e.target.value)}>
          <option value="">Select a student</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.studentCode || s.email}</option>)}
        </select>
      </label>
      {student ? <StudentLedger key={student} studentId={student} /> : <p className="card">Select a student to view their fees and payment history.</p>}
    </div>
  );
}

function amountMinor(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) throw new Error("Enter an amount with no more than two decimal places");
  const [whole, fraction = ""] = text.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (result <= 0 || result > 100_000_000) throw new Error("Amount must be between ৳0.01 and ৳1,000,000");
  return result;
}

function StudentLedger({ studentId }: { studentId: string }) {
  const { data, error, loading, refresh } = useBilling(studentId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const feeRequest = useRef("");
  const paymentRequest = useRef("");
  async function submit(event: React.FormEvent<HTMLFormElement>, payment: boolean) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const token = payment ? paymentRequest : feeRequest;
    if (!token.current) token.current = crypto.randomUUID();
    setBusy(true); setSaveError(""); setMessage("");
    try {
      const common = { requestId: token.current, amountMinor: amountMinor(fields.get("amount")) };
      await request(payment ? "fee-payments" : "fee-charges", payment ? {
        ...common, feeId: fields.get("feeId"), paidAt: new Date(fields.get("paidDate") + "T00:00:00+06:00").toISOString(),
        method: fields.get("method"), reference: fields.get("reference"),
      } : { ...common, userId: studentId, title: fields.get("title"), dueDate: fields.get("dueDate") });
      token.current = "";
      form.reset();
      setMessage(payment ? "Payment recorded." : "Fee added.");
      await refresh();
    } catch (err) { setSaveError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <>
      {message && <p className="success" role="status">{message}</p>}
      {saveError && <p className="error" role="alert">{saveError}</p>}
      <div className="grid two billing-admin-forms">
        <form className="card" onSubmit={(e) => submit(e, false)}>
          <fieldset className="form" disabled={busy || loading || !!error}>
            <h3>Add a fee</h3>
            <label className="label">Fee description<input className="input" name="title" maxLength={200} placeholder="e.g. November tuition" required /></label>
            <label className="label">Fee amount (BDT)<input className="input" name="amount" type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" required /></label>
            <label className="label">Due date<input className="input" type="date" name="dueDate" required /></label>
            <button className="btn" disabled={busy}>Add fee</button>
          </fieldset>
        </form>
        <form className="card" onSubmit={(e) => submit(e, true)}>
          <fieldset className="form" disabled={busy || loading || !!error || !data?.fees.some((f) => f.dueMinor > 0)}>
            <h3>Record a received payment</h3>
            <label className="label">Fee<select name="feeId" aria-label="Fee" className="input" required defaultValue="">
              <option value="">Select an unpaid fee</option>
              {data?.fees.filter((f) => f.dueMinor > 0).map((f) => <option key={f.id} value={f.id}>{f.title} · {money(f.dueMinor)} due</option>)}
            </select></label>
            <div className="grid two">
              <label className="label">Amount received (BDT)<input className="input" name="amount" type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" required /></label>
              <label className="label">Payment date<input className="input" type="date" name="paidDate" defaultValue={dhakaDate()} max={dhakaDate()} required /></label>
            </div>
            <label className="label">Payment method<select className="input" aria-label="Payment method" name="method">{["Cash", "bKash", "Nagad", "Bank transfer", "Other"].map((m) => <option key={m}>{m}</option>)}</select></label>
            <label className="label">Transaction reference (optional)<input className="input" name="reference" maxLength={100} /></label>
            <button className="btn" disabled={busy}>Record payment</button>
          </fieldset>
        </form>
      </div>
      {loading ? <p role="status">Loading payment records…</p> : error ? <p className="error" role="alert">{error} <button className="underline" onClick={refresh}>Retry</button></p> : data && <BillingSummary data={data} />}
    </>
  );
}
