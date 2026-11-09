export function dhakaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function revisionDates(
  date: string,
  status: "RED" | "YELLOW" | "GREEN",
) {
  const days =
    status === "RED" ? [1, 2, 4, 7, 21] : status === "YELLOW" ? [1, 4, 7] : [];
  return days.map((n) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  });
}
export function percentage(done: number, total: number) {
  return total ? Math.round((done / total) * 10000) / 100 : 0;
}
export function rank(scores: number[], score: number) {
  return 1 + scores.filter((s) => s > score).length;
}
export function scoreExam(
  questions: { id: string; correctOption: number; marks: number }[],
  answers: { questionId: string; option: number }[],
) {
  const selected = new Map(answers.map((a) => [a.questionId, a.option]));
  return {
    score: questions.reduce(
      (s, q) => s + (selected.get(q.id) === q.correctOption ? q.marks : 0),
      0,
    ),
    total: questions.reduce((s, q) => s + q.marks, 0),
    correct: questions.filter((q) => selected.get(q.id) === q.correctOption)
      .length,
  };
}
export function youtubeUrl(input: string) {
  const u = new URL(input);
  if (u.protocol !== "https:" || u.username || u.password || u.port)
    throw new Error("Use a secure YouTube video URL");
  const hosts = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];
  if (!hosts.includes(u.hostname))
    throw new Error("Unsupported YouTube domain");
  const id =
    u.hostname === "youtu.be"
      ? u.pathname.slice(1)
      : u.pathname === "/watch"
        ? u.searchParams.get("v")
        : u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1];
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id))
    throw new Error("Invalid YouTube video ID");
  return `https://www.youtube.com/watch?v=${id}`;
}
export function safeUrl(input: string) {
  const u = new URL(input);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname)
  )
    throw new Error("Use an HTTPS public resource link");
  return u.toString();
}
export function anonymousQuestion(q: {
  id: string;
  topic: string;
  text: string;
  audioId: string | null;
  reported: boolean;
  createdAt: Date;
  replies: {
    id: string;
    text: string;
    audioId: string | null;
    createdAt: Date;
  }[];
}) {
  return {
    id: q.id,
    topic: q.topic,
    text: q.text,
    audioId: q.audioId,
    reported: q.reported,
    createdAt: q.createdAt,
    author: "Anonymous Student",
    replies: q.replies.map((r) => ({
      id: r.id,
      text: r.text,
      audioId: r.audioId,
      createdAt: r.createdAt,
      author: "Anonymous Teacher",
    })),
  };
}
