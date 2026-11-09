import { afterEach, describe, it, expect, vi } from "vitest";
import { readFile } from "node:fs/promises";
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("google-auth-library", () => ({
  GoogleAuth: class {
    async getClient() {
      return { request };
    }
  },
}));
import { sendEmail, syncSheet } from "../src/lib/integrations";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  request.mockReset();
});
describe("External adapters with explicit development/test boundaries", () => {
  it("writes a local preview without claiming delivery", async () => {
    vi.stubEnv("EMAIL_MODE", "local");
    const key = "test-preview-" + Date.now();
    const result = await sendEmail(
      "learner@example.test",
      "Spark Academy Revision Reminder",
      "Review your topic today.",
      key,
    );
    expect(result).toBe("LOCAL_PREVIEW");
    const saved = JSON.parse(await readFile(`.local/mail/${key}.json`, "utf8"));
    expect(saved.delivery).toBe("LOCAL_PREVIEW_ONLY");
  });
  it("requires live credentials rather than faking delivery", async () => {
    vi.stubEnv("EMAIL_MODE", "provider");
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(
      sendEmail("learner@example.test", "Reminder", "Review", "test"),
    ).rejects.toThrow("not configured");
  });
  it("passes provider idempotency keys and propagates a failed delivery", async () => {
    vi.stubEnv("EMAIL_MODE", "provider");
    vi.stubEnv("RESEND_API_KEY", "test-provider-key");
    vi.stubEnv("EMAIL_FROM", "Spark Academy <sender@example.test>");
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 503 }));
    await expect(
      sendEmail("learner@example.test", "Reminder", "Review", "stable-id"),
    ).rejects.toThrow("503");
    expect(
      (fetcher.mock.calls[0][1]?.headers as Record<string, string>)[
        "Idempotency-Key"
      ],
    ).toBe("stable-id");
  });
  it("updates the same Sheets topic row on retry instead of appending duplicates", async () => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "service@example.test");
    vi.stubEnv("GOOGLE_PRIVATE_KEY", "test-only");
    vi.stubEnv("GOOGLE_SPREADSHEET_ID", "test-sheet");
    request
      .mockResolvedValueOnce({ data: { values: [["Topic ID"], ["topic-1"]] } })
      .mockResolvedValueOnce({ data: {} });
    await syncSheet([
      "topic-1",
      "learner-reference",
      "Physics",
      "Motion",
      "Force",
      "2026-11-09",
      "RED",
      "2026-11-10",
      "",
    ]);
    expect(request.mock.calls[1][0].method).toBe("PUT");
    expect(request.mock.calls[1][0].url).toContain("Revisions!A2:I2");
  });
  it("appends a new topic once and surfaces synchronization failures", async () => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "service@example.test");
    vi.stubEnv("GOOGLE_PRIVATE_KEY", "test-only");
    vi.stubEnv("GOOGLE_SPREADSHEET_ID", "test-sheet");
    request
      .mockResolvedValueOnce({ data: { values: [["Topic ID"]] } })
      .mockRejectedValueOnce(new Error("Provider unavailable"));
    await expect(syncSheet(["topic-new"])).rejects.toThrow(
      "Provider unavailable",
    );
    expect(request.mock.calls[1][0].url).toContain(":append");
  });
});
