import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
it("exposes Google OAuth only when both server-side credentials exist", async () => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-web-client.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-server-only-secret");
  vi.resetModules();
  const { authOptions } = await import("../src/lib/auth");
  const google = authOptions.providers.find((p) => p.id === "google");
  expect(google).toMatchObject({
    id: "google", type: "oauth", idToken: true, checks: ["pkce", "state"],
    options: { clientId: "test-web-client.apps.googleusercontent.com", clientSecret: "test-server-only-secret" },
  });
  expect(authOptions.providers.some((p) => p.id === "credentials")).toBe(true);
});
it("keeps password login available without registering a broken Google provider", async () => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-web-client.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
  vi.resetModules();
  const { authOptions } = await import("../src/lib/auth");
  expect(authOptions.providers.map((p) => p.id)).toEqual(["credentials"]);
});
