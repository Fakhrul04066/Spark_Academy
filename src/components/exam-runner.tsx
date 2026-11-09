"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
type Question = {
  id: string;
  text: string;
  marks: number;
  correctOption?: number;
  options: { text: string; order: number }[];
};
type Attempt = {
  id: string;
  title: string;
  deadline: string;
  submittedAt: string | null;
  releaseAt: string;
  answers: { questionId: string; option: number }[];
  questions: Question[];
  score?: number;
  total?: number;
  correct?: number;
  wrong?: number;
  attempted?: number;
  totalQuestions?: number;
  durationSeconds?: number;
};
async function request(path: string, body?: unknown) {
  const r = await fetch("/api/exam-attempts/" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d.data;
}
export function ExamRunner({ id }: { id: string }) {
  const [attempt, setAttempt] = useState<Attempt | null>(null),
    [answers, setAnswers] = useState<Record<string, number>>({}),
    [index, setIndex] = useState(0),
    [seconds, setSeconds] = useState(0),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const answerRef = useRef(answers),
    submitting = useRef(false),
    saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const load = async () => {
    const a = await request(id);
    setAttempt(a);
    const values = Object.fromEntries(
      a.answers.map((v: { questionId: string; option: number }) => [
        v.questionId,
        v.option,
      ]),
    );
    setAnswers(values);
    answerRef.current = values;
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [id]);
  function payload() {
    return {
      id,
      answers: Object.entries(answerRef.current).map(
        ([questionId, option]) => ({ questionId, option }),
      ),
    };
  }
  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await saveChain.current;
      await request("submit", payload());
      await load();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!attempt || attempt.submittedAt) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((+new Date(attempt.deadline) - Date.now()) / 1000),
      );
      setSeconds(remaining);
      if (!remaining) submit();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt?.deadline, attempt?.submittedAt]);
  function select(questionId: string, option: number) {
    const next = { ...answerRef.current, [questionId]: option };
    answerRef.current = next;
    setAnswers(next);
    setStatus("Saving…");
    saveChain.current = saveChain.current
      .catch(() => {})
      .then(() =>
        request("save", {
          id,
          answers: Object.entries(next).map(([questionId, option]) => ({
            questionId,
            option,
          })),
        }),
      )
      .then(() => {
        setStatus("Answers saved");
        setError("");
      })
      .catch((e) => {
        setStatus("Not saved");
        setError(e.message);
      });
  }
  if (!attempt)
    return (
      <div className="card">
        {error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="skeleton" />
        )}
      </div>
    );
  if (attempt.submittedAt)
    return (
      <div className="card stack max-w-3xl mx-auto">
        <span className="eyebrow">EXAMINATION COMPLETE</span>
        <h1>{attempt.title}</h1>
        {attempt.score !== undefined ? (
          <>
            <div className="grid three">
              <div className="stat">
                <strong>
                  {attempt.score}/{attempt.total}
                </strong>
                <p>Obtained marks</p>
              </div>
              <div className="stat">
                <strong>{attempt.correct}</strong>
                <p>Correct answers</p>
              </div>
              <div className="stat">
                <strong>{attempt.wrong}</strong>
                <p>Wrong answers</p>
              </div>
            </div>
            <p>
              {attempt.attempted} attempted / {attempt.totalQuestions} questions
              · {attempt.durationSeconds} seconds
            </p>
            {attempt.questions.map((q) => (
              <div className="card" key={q.id}>
                <strong>{q.text}</strong>
                <p className="mt-2">
                  Correct answer:{" "}
                  {q.options.find((o) => o.order === q.correctOption)?.text}
                </p>
              </div>
            ))}
          </>
        ) : (
          <div className="notice">
            Your answers have been submitted. Results will be released on{" "}
            {new Date(attempt.releaseAt).toLocaleString("en-GB", {
              timeZone: "Asia/Dhaka",
            })}{" "}
            Asia/Dhaka.
          </div>
        )}
        <Link className="btn justify-self-start" href="/student/results">
          View results & ranking
        </Link>
      </div>
    );
  const q = attempt.questions[index];
  return (
    <div className="stack max-w-4xl mx-auto">
      <div className="card row">
        <div>
          <span className="eyebrow">CHAPTER EXAMINATION</span>
          <h2 className="mt-2">{attempt.title}</h2>
          <p className="text-xs mt-2">
            Answers save after every selection. At the deadline, only previously
            saved answers count.
          </p>
        </div>
        <div>
          <div className="exam-timer" aria-label="Time remaining">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </div>
          <p className="footnote">Remaining</p>
        </div>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <div className="card stack">
        <div className="row">
          <span className="pill">
            Question {index + 1} of {attempt.questions.length}
          </span>
          <span className="footnote">{q.marks} marks</span>
        </div>
        <h3>{q.text}</h3>
        {q.options.map((o) => (
          <label className="check-option" key={o.order}>
            <input
              type="radio"
              name={q.id}
              checked={answers[q.id] === o.order}
              onChange={() => select(q.id, o.order)}
              disabled={busy}
            />
            {o.text}
          </label>
        ))}
        <div className="row">
          <button
            className="btn secondary"
            disabled={!index}
            onClick={() => setIndex((i) => i - 1)}
          >
            Previous
          </button>
          <span className="footnote" role="status">
            {status}
          </span>
          <button
            className="btn secondary"
            disabled={index === attempt.questions.length - 1}
            onClick={() => setIndex((i) => i + 1)}
          >
            Next
          </button>
        </div>
      </div>
      <div className="card row">
        <div className="flex">
          {attempt.questions.map((q, i) => (
            <button
              aria-label={`Go to question ${i + 1}`}
              className={`btn small ${answers[q.id] === undefined ? "secondary" : ""}`}
              key={q.id}
              onClick={() => setIndex(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          className="btn"
          disabled={busy}
          onClick={() => {
            if (
              confirm(
                `Submit ${Object.keys(answers).length} answered questions?`,
              )
            )
              submit();
          }}
        >
          {busy ? "Submitting…" : "Submit examination"}
        </button>
      </div>
    </div>
  );
}
