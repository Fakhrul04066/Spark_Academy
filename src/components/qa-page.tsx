"use client";

import { Bookmark, CircleCheck, Hourglass, Plus, Search, MessageCircle, MessageSquare, Flag, X, Users, Atom, FlaskConical, Calculator, Sigma, Dna, BookOpen } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { readQa } from "@/services/qa-access";
import { QaQuestionForm, type QaDraft } from "./qa-question-form";
import { VoiceRecorder } from "./voice-recorder";
import "./qa-page.css";

type Board = Awaited<ReturnType<typeof readQa>>;
type Question = Board["items"][number];

function subjectIcon(name: string) {
  const subject = name.toLowerCase();
  if (subject.includes("physics")) return Atom;
  if (subject.includes("chemistry")) return FlaskConical;
  if (subject.includes("higher math")) return Sigma;
  if (subject.includes("math")) return Calculator;
  if (subject.includes("biology")) return Dna;
  return BookOpen;
}

function timeAgo(value: Date) {
  const seconds = Math.max(0, (Date.now() - Number(new Date(value))) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "always" });
  if (seconds >= 86400) return formatter.format(-Math.floor(seconds / 86400), "day");
  if (seconds >= 3600) return formatter.format(-Math.floor(seconds / 3600), "hour");
  if (seconds >= 60) return formatter.format(-Math.floor(seconds / 60), "minute");
  return "Just now";
}

async function request<T>(path: string, body?: unknown, method = "POST", signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/" + path, {
    signal,
    ...(body === undefined ? {} : {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result.data;
}

function QaDialog({ title, close, busy, compose, children }: { title: string; close: () => void; busy: boolean; compose?: boolean; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return <dialog ref={dialog} className={compose ? "sq-dialog sq-dialog-compose" : "sq-dialog"} aria-labelledby="sq-dialog-title" onClose={close} onCancel={(event) => { if (busy) event.preventDefault(); }}>
    <div className="sq-dialog-heading">
      <div>
        <h2 id="sq-dialog-title">{title}</h2>
        {compose && <p lang="bn">তোমার প্রশ্নটি বিস্তারিতভাবে লিখো। তোমার পরিচয় গোপন থাকবে।</p>}
      </div>
      <button type="button" onClick={close} disabled={busy} aria-label="Close dialog"><X size={17} /></button>
    </div>
    {children}
  </dialog>;
}

type DiscussionItem = {
  id: string;
  text: string;
  createdAt: Date;
  author: string;
};

function QaDiscussion({ questionId, canPost, onChange }: {
  questionId: string;
  canPost: boolean;
  onChange: () => void;
}) {
  const [items, setItems] = useState<DiscussionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    request<{ items: DiscussionItem[]; hasMore: boolean }>(
      "qa/comments?" + new URLSearchParams({ questionId, page: String(page) }),
      undefined, "GET", abort.signal,
    ).then((result) => {
      setItems(result.items); setHasMore(result.hasMore);
    }).catch((err) => {
      if (!abort.signal.aborted) setError(err.message);
    }).finally(() => {
      if (!abort.signal.aborted) setLoading(false);
    });
    return () => abort.abort();
  }, [questionId, page]);

  function changePage(next: number) {
    setPage(next); setLoading(true); setError("");
  }

  async function submit(text: FormDataEntryValue | null) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await request("qa/comments", { questionId, text });
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return <section className="sq-discussion" aria-label="Comments">
    <h3>Comments</h3>
    {loading && <p role="status">Loading…</p>}
    {!loading && !error && !items.length && <p>No comments yet.</p>}
    {!loading && items.map((item) => <div className="sq-discussion-item" key={item.id}>
      <div className="sq-discussion-meta">
        <strong>{item.author}</strong>
        <time dateTime={new Date(item.createdAt).toISOString()}>{timeAgo(item.createdAt)}</time>
      </div>
      <p>{item.text}</p>
    </div>)}
    {!loading && (page > 1 || hasMore) && <div className="sq-actions">
      <button type="button" disabled={page === 1 || busy} onClick={() => changePage(page - 1)}>Newer</button>
      <button type="button" disabled={!hasMore || busy} onClick={() => changePage(page + 1)}>Older</button>
    </div>}
    {!loading && canPost && (
      <form className="sq-discussion-form" onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget).get("text"));
      }}>
        <textarea name="text" required maxLength={2000} rows={2}
          aria-label="Add a comment" placeholder="Add a comment…" />
        <button className="sq-primary" disabled={busy}>Post Comment</button>
      </form>
    )}
    {!canPost && <small>An active Q&A plan is required to comment.</small>}
    {error && <p className="sq-notice" role="alert">{error}</p>}
  </section>;
}

export function QaPage({ student }: { student: boolean }) {
  const [board, setBoard] = useState<Board>();
  const [tab, setTab] = useState("timeline");
  const [term, setTerm] = useState("");
  const [subject, setSubject] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"ask" | Question | null>(null);
  const [formError, setFormError] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [audioId, setAudio] = useState("");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ tab, q: term, subject, page: String(page) });
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      request<Board>("qa?" + params, undefined, "GET", ctrl.signal)
        .then((data) => { if (!ctrl.signal.aborted) setBoard(data); })
        .catch((e) => { if (!ctrl.signal.aborted) setError(e.message); })
        .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    }, term ? 180 : 0);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [tab, term, subject, page, refresh]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.key === "/" && !dialog && !event.ctrlKey && !event.metaKey &&
          !(event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable]"))) {
        event.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [dialog]);

  const batches = new Map(board?.assignments.map((item) => [item.batchId, item.batch.name]));
  const subjects = new Map(board?.assignments.map((item) => [item.subjectId, item.subject.name]));
  const open = (next: "ask" | Question) => {
    if (busy) return;
    setAudio(""); setFormError("");
    setDialog(next);
  };
  const update = () => setRefresh((value) => value + 1);
  async function act(path: string, body: unknown, method = "POST") {
    if (busy) return;
    setBusy(true); setError("");
    try { await request(path, body, method); update(); }
    catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setBusy(false); }
  }

  async function submitQuestion(draft: QaDraft) {
    setBusy(true); setFormError("");
    try {
      await request("questions", draft);
      setTab("mine"); setTerm(""); setSubject(""); setPage(1);
      setDialog(null); update();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return <section className="sq-board" aria-label="Questions and answers">
    <header className="sq-hero">
      <div>
        <p lang="bn">তোমার প্রশ্ন করো, সমাধান খুঁজে নাও, আর সহপাঠীদের সঙ্গে শেখো।</p>
        {student && board?.active && <span className="sq-quota"><CircleCheck size={16} /> <span><strong>{board.used}/{board.limit} questions used this month</strong> · {board.remaining} left · resets {board.resetsOn}</span></span>}
      </div>
      {student && <button className="sq-primary" type="button" onClick={() => open("ask")} disabled={!board?.active || !board.remaining || !batches.size || busy}><Plus size={18} /> Add Question</button>}
    </header>
    {student && board && !board.active && <p className="sq-notice">Active paid-student or monthly Q&amp;A access is required to ask questions. <a href="/#qa-course">View the Q&amp;A plan</a></p>}
    {student && board?.active && !batches.size && <p className="sq-notice">Your batch does not have an assigned Q&amp;A teacher yet.</p>}
    <label className="sq-search"><Search size={19} /><input ref={search} type="search" placeholder="Search questions or topics…" aria-label="Search questions or topics" maxLength={100} value={term} onChange={(e) => { setTerm(e.target.value); setPage(1); }} /><kbd>/</kbd></label>
    <div className="sq-stats">
      <div><CircleCheck size={34} /><span><strong>{board?.answeredCount ?? "–"}</strong>Questions Answered</span></div>
      <div><Hourglass size={34} /><span><strong>{board?.pendingCount ?? "–"}</strong>{student ? "My Pending" : "Pending Questions"}</span></div>
      {student && <div><Bookmark size={34} /><span><strong>{board?.savedCount ?? "–"}</strong>Saved Explanations</span></div>}
    </div>
    <nav className="sq-tabs" aria-label="Question views">
      {(student ? [["timeline", "Timeline"], ["mine", "My Questions"], ["saved", "Saved"]] : [["timeline", "Timeline"], ["queue", "Teacher Queue"]]).map(([id, label]) =>
        <button type="button" key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setPage(1); }}>{label}</button>)}
    </nav>
    <div className="sq-filters" aria-label="Subjects">
      {[["", "All Subjects"], ...subjects].map(([id, label]) => {
        const Subject = subjectIcon(label);
        return <button type="button" key={id} aria-pressed={subject === id} onClick={() => { setSubject(id); setPage(1); }}>{id && <Subject size={15} />}{label}</button>;
      })}
    </div>
    {error && <p className="sq-notice" role="alert">{error}</p>}
    <div className="sq-feed" aria-busy={loading}>
      {loading && <p role="status">Loading questions…</p>}
      {!loading && !error && !board?.items.length && <p className="sq-empty">No questions in this view yet.</p>}
      {!loading && board?.items.map((item) => {
        const answered = item.replies.length > 0;
        const Subject = subjectIcon(item.subject);
        return <article className={answered ? "sq-card sq-card-answered" : "sq-card sq-card-pending"} key={item.id}>
        <div className="sq-card-header">
          <span className="sq-subject-icon"><Subject size={19} /></span>
          <div><strong>{item.className} · {item.subject}</strong>{item.chapter && <small>Chapter: {item.chapter}</small>}</div>
          <div className="sq-card-status"><span className={answered ? "sq-answered" : "sq-pending"}>{answered ? "Answered" : "Pending"}</span>
            <time dateTime={new Date(item.createdAt).toISOString()}>{timeAgo(item.createdAt)}</time>
          </div>
        </div>
        <h2>{item.topic}</h2>
        {item.text && <p className="sq-question-text">{item.text}</p>}
        {!!item.images.length && <div className="sq-card-images">
          {item.images.map((id, index) => <a key={id} href={"/api/question-images/" + id} target="_blank" rel="noreferrer">
            <img className="sq-image" src={"/api/question-images/" + id} loading="lazy" alt={"Question attachment " + (index + 1)} />
          </a>)}
        </div>}
        {item.audioId && <audio controls preload="none" aria-label="Question recording" src={"/api/audio/" + item.audioId + "?stream=1"} />}
        <div className="sq-doubt">
          {student && !item.mine
            ? <button type="button" aria-pressed={item.sameDoubt} disabled={busy} onClick={() => act("qa/signal", { questionId: item.id, action: "sameDoubt", value: !item.sameDoubt })}><Users size={16} /> Same doubt <strong>{item.sameDoubtCount}</strong></button>
            : <><Users size={16} /><strong>{item.sameDoubtCount}</strong> {item.sameDoubtCount === 1 ? "student shares" : "students share"} this doubt</>}
        </div>
        <ol className="sq-progress" aria-label="Question progress">
          <li className="sq-step-done"><strong>Asked</strong><small>{timeAgo(item.createdAt)}</small></li>
          <li className={answered ? "sq-step-done" : undefined} aria-current={answered ? undefined : "step"}><strong>With teacher</strong><small>{answered ? "Reviewed" : "In queue"}</small></li>
          <li className={answered ? "sq-step-done" : undefined} aria-current={answered && !item.understood ? "step" : undefined}><strong>Answered</strong>{answered && <small>{timeAgo(item.replies[0].createdAt)}</small>}</li>
          <li className={item.understood ? "sq-step-done" : undefined} aria-current={item.understood ? "step" : undefined}><strong>Understood</strong>{item.understood && <small>You</small>}</li>
        </ol>
        {!answered && <p className="sq-card-notice">{item.mine
          ? <><span lang="bn">তোমার প্রশ্নটি শিক্ষকের কাছে পৌঁছেছে।</span> Your question is with the teacher and will be answered soon.</>
          : "This question is waiting for the teacher’s answer."}</p>}
        {item.replies.map((reply) => <div className="sq-answer" key={reply.id}>
          <strong><CircleCheck size={17} /> Teacher’s answer</strong><small>{timeAgo(reply.createdAt)}</small>
          {reply.text && <p>{reply.text}</p>}{reply.audioId && <audio controls preload="none" aria-label="Teacher recording" src={"/api/audio/" + reply.audioId + "?stream=1"} />}
        </div>)}
        {student && answered && <div className="sq-understood">
          <span>{item.understood ? "Marked as understood" : "Did this clear your doubt?"}</span>
          <button type="button" disabled={busy} onClick={() => act("qa/signal", { questionId: item.id, action: "understood", value: !item.understood })}>{item.understood ? "Undo" : "Got it"}</button>
        </div>}
        {(!student || answered) && <div className={answered ? "sq-actions sq-answer-actions" : "sq-actions"}>
          {answered && <button type="button" aria-expanded={openComments === item.id} onClick={() => setOpenComments(openComments === item.id ? null : item.id)}>
            <MessageSquare size={16} /> Comments ({item.commentCount})
          </button>}
          {student && answered && <button type="button" disabled={busy} aria-pressed={item.saved} onClick={() => act("qa/bookmark", { questionId: item.id, saved: !item.saved })}><Bookmark size={16} /> {item.saved ? "Saved" : "Save Question"}</button>}
          {(!student || (item.mine && answered)) && <button type="button" disabled={busy || item.reported} onClick={() => act("questions", { id: item.id, reported: true }, "PATCH")}><Flag size={16} /> {item.reported ? "Reported" : "Report"}</button>}
          {!student && <button type="button" disabled={busy} onClick={() => open(item)}><MessageCircle size={16} /> Answer</button>}
        </div>}
        {answered && openComments === item.id && <QaDiscussion
          key={refresh}
          questionId={item.id}
          canPost={!student || !!board.active}
          onChange={update}
        />}
      </article>})}
    </div>
    {!loading && (page > 1 || board?.hasMore) && <div className="sq-actions"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><button type="button" disabled={!board?.hasMore} onClick={() => setPage(page + 1)}>Next</button></div>}
    {dialog === "ask" && board && <QaDialog title="Add Question" compose busy={busy} close={() => setDialog(null)}>
      <QaQuestionForm assignments={board.assignments} busy={busy} error={formError} cancel={() => setDialog(null)} submit={submitQuestion} />
    </QaDialog>}
    {dialog && dialog !== "ask" && <QaDialog title="Answer Question" busy={busy} close={() => setDialog(null)}>
      <form className="sq-form" onSubmit={async (event) => {
        event.preventDefault();
        const text = String(new FormData(event.currentTarget).get("text") ?? "");
        setBusy(true); setFormError("");
        try {
          await request("question-replies", { questionId: dialog.id, text, ...(audioId ? { audioId } : {}) });
          setDialog(null); update();
        } catch (e) { setFormError(e instanceof Error ? e.message : "Request failed"); }
        finally { setBusy(false); }
      }}>
        <label>Your explanation<textarea name="text" rows={4} maxLength={10000} /></label>
        <VoiceRecorder onUploaded={setAudio} />
        {formError && <p className="sq-notice" role="alert">{formError}</p>}
        <button className="sq-primary" disabled={busy}>{busy ? "Submitting…" : "Post Answer"}</button>
      </form>
    </QaDialog>}
  </section>;
}

export function QaAccessForm({ batches }: { batches: { id: string; name: string }[] }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <details className="sq-access">
    <summary>Manage Q&amp;A access</summary>
    <form className="sq-form" onSubmit={async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const revoke = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "revoke";
      setBusy(true); setMessage("");
      try {
        if (!revoke && !form.get("expiresOn")) throw new Error("Choose an expiry date.");
        await request("qa/access", {
          email: form.get("email"), batchId: form.get("batchId"), kind: form.get("kind"),
          expiresOn: revoke ? null : form.get("expiresOn"),
        });
        setMessage(revoke ? "Access revoked." : "Access granted.");
      } catch (e) { setMessage(e instanceof Error ? e.message : "Request failed"); }
      finally { setBusy(false); }
    }}>
      <label>Student email<input required type="email" name="email" /></label>
      <label>Batch<select name="batchId" required defaultValue=""><option value="" disabled>Select batch</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></label>
      <label>Access type<select name="kind"><option value="PAID_STUDENT">Paid student</option><option value="QNA_ONLY">Q&amp;A only</option></select></label>
      <label>Last active day (Bangladesh)<input type="date" name="expiresOn" /></label>
      <div className="sq-actions"><button className="sq-primary" disabled={busy} value="grant">Grant or renew</button><button disabled={busy} value="revoke">Revoke</button></div>
      {message && <p role="status">{message}</p>}
    </form>
  </details>;
}
