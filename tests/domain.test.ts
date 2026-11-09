import { describe, it, expect } from "vitest";
import {
  revisionDates,
  dhakaDate,
  rank,
  scoreExam,
  percentage,
  youtubeUrl,
  safeUrl,
  anonymousQuestion,
} from "../src/lib/domain";
describe("Academic rules", () => {
  it("schedules the exact red dates from the brief", () =>
    expect(revisionDates("2026-11-09", "RED")).toEqual([
      "2026-11-10",
      "2026-11-11",
      "2026-11-13",
      "2026-11-16",
      "2026-11-30",
    ]));
  it("handles yellow, green and month/year boundaries", () => {
    expect(revisionDates("2026-12-31", "YELLOW")).toEqual([
      "2027-01-01",
      "2027-01-04",
      "2027-01-07",
    ]);
    expect(revisionDates("2026-11-09", "GREEN")).toEqual([]);
  });
  it("uses Dhaka calendar dates near midnight", () =>
    expect(dhakaDate(new Date("2026-11-09T20:00:00Z"))).toBe("2026-11-10"));
  it("uses competition ranks with ties", () => {
    expect(rank([10, 10, 8, 5], 10)).toBe(1);
    expect(rank([10, 10, 8, 5], 8)).toBe(3);
  });
  it("scores only correct answers with weighted marks", () =>
    expect(
      scoreExam(
        [
          { id: "a", correctOption: 1, marks: 2 },
          { id: "b", correctOption: 0, marks: 3 },
        ],
        [
          { questionId: "a", option: 1 },
          { questionId: "b", option: 2 },
        ],
      ),
    ).toEqual({ score: 2, total: 5, correct: 1 }));
  it("calculates empty attendance and progress without division by zero", () => {
    expect(percentage(0, 0)).toBe(0);
    expect(percentage(4, 5)).toBe(80);
  });
  it("accepts supported YouTube formats and rejects redirect domains", () => {
    expect(youtubeUrl("https://youtu.be/dQw4w9WgXcQ?t=1")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(() =>
      youtubeUrl("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ"),
    ).toThrow();
    expect(() => youtubeUrl("javascript:alert(1)")).toThrow();
    expect(() => youtubeUrl("https://youtube.com/redirect?q=evil")).toThrow();
  });
  it("rejects unsafe resource protocols", () => {
    expect(() => safeUrl("javascript:alert(1)")).toThrow();
    expect(() => safeUrl("https://127.0.0.1/private")).toThrow();
  });
  it("serializes anonymous Q&A with an explicit allowlist", () => {
    const raw = {
      id: "q",
      topic: "Motion",
      text: "Why?",
      audioId: null,
      reported: false,
      createdAt: new Date(),
      userId: "secret-student",
      email: "secret@example.test",
      replies: [
        {
          id: "r",
          text: "Because",
          audioId: null,
          createdAt: new Date(),
          userId: "secret-teacher",
        },
      ],
    };
    const result = JSON.stringify(anonymousQuestion(raw));
    expect(result).not.toContain("secret");
    expect(result).not.toContain("userId");
    expect(result).toContain("Anonymous Teacher");
  });
});
