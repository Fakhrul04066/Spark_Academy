import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import { resolveGoogleStudent } from "../src/services/google-signin";
import { authOptions } from "../src/lib/auth";

const tag = crypto.randomUUID();
const prefix = "spark-oauth-test-" + tag;
const subjects: string[] = [];
const emails: string[] = [];
function profile(overrides = {}) {
  const sub = prefix + "-" + crypto.randomUUID();
  const email = `spark-${crypto.randomUUID()}@gmail.com`;
  subjects.push(sub); emails.push(email);
  return { sub, email, email_verified: true, name: "তানভীর আহমেদ", ...overrides };
}
async function existing(email: string, extra = {}) {
  emails.push(email);
  return db.user.create({ data: { email, name: "Existing student", role: "STUDENT", passwordHash: "unused-test-hash", ...extra } });
}
beforeAll(() => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("/spark_test")) throw new Error("Use isolated test database");
});
afterAll(async () => {
  const where = { OR: [{ googleSubject: { in: subjects } }, { email: { in: emails } }] };
  const users = await db.user.findMany({ where, select: { id: true } });
  await db.auditLog.deleteMany({ where: { actorId: { in: users.map((u) => u.id) } } });
  await db.user.deleteMany({ where });
  await db.$disconnect();
});
describe("Google student sign-in", () => {
  it("creates a student with the Google name and reuses its database identity", async () => {
    const claims = profile({ role: "ADMIN" });
    const user = await resolveGoogleStudent(claims);
    expect(user).toMatchObject({ role: "STUDENT", name: claims.name, email: claims.email, googleSubject: claims.sub, active: true });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user.passwordHash).not.toContain(claims.sub);
    const again = await resolveGoogleStudent({ ...claims, name: "New Google name", email: `changed-${tag}@gmail.com` });
    expect(again.id).toBe(user.id);
    expect(again.name).toBe(claims.name);
    expect(await db.user.count({ where: { googleSubject: claims.sub } })).toBe(1);
  });
  it("links an existing active Gmail student without changing its password, name or history", async () => {
    const claims = profile();
    const before = await existing(claims.email, { studentCode: prefix });
    const result = await resolveGoogleStudent(claims);
    expect(result).toMatchObject({ id: before.id, name: before.name, passwordHash: before.passwordHash, studentCode: prefix, googleSubject: claims.sub });
  });
  it("rejects unverified email, inactive accounts, and automatic linking of privileged accounts", async () => {
    const claims = profile();
    await expect(resolveGoogleStudent({ ...claims, email_verified: false })).rejects.toThrow("GoogleEmailUnverified");
    await expect(resolveGoogleStudent({ ...claims, email_verified: "true" })).rejects.toThrow("GoogleEmailUnverified");
    expect(await db.user.findUnique({ where: { email: claims.email } })).toBeNull();
    const inactive = await existing(claims.email, { active: false });
    await expect(resolveGoogleStudent(claims)).rejects.toThrow("AccountInactive");
    expect((await db.user.findUniqueOrThrow({ where: { id: inactive.id } })).active).toBe(false);
    for (const role of ["ADMIN", "TEACHER"] as const) {
      const p = profile(); await existing(p.email, { role });
      await expect(resolveGoogleStudent(p)).rejects.toThrow("GoogleLinkRequired");
    }
    const linked = profile();
    const u = await resolveGoogleStudent(linked);
    await db.user.update({ where: { id: u.id }, data: { active: false } });
    await expect(resolveGoogleStudent(linked)).rejects.toThrow("AccountInactive");
  });
  it("does not link third-party email addresses or replace an existing Google identity", async () => {
    const p = profile({ email: `external-${tag}@example.test` }); emails.push(p.email);
    await existing(p.email);
    await expect(resolveGoogleStudent(p)).rejects.toThrow("GoogleLinkRequired");
    const first = profile(); const user = await resolveGoogleStudent(first);
    const replacement = profile({ email: first.email });
    await expect(resolveGoogleStudent(replacement)).rejects.toThrow("GoogleLinkRequired");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).googleSubject).toBe(first.sub);
  });
  it("allows authoritative Google Workspace email and handles concurrent first sign-ins", async () => {
    const workspace = profile({ email: `workspace-${tag}@example.test`, hd: "example.test" }); emails.push(workspace.email);
    const before = await existing(workspace.email);
    expect((await resolveGoogleStudent(workspace)).id).toBe(before.id);
    const p = profile();
    const [a, b] = await Promise.all([resolveGoogleStudent(p), resolveGoogleStudent(p)]);
    expect(a.id).toBe(b.id);
    expect(await db.user.count({ where: { email: p.email } })).toBe(1);
  });
  it("puts the local user ID and session version into Google JWTs", async () => {
    const p = profile();
    const signIn = authOptions.callbacks!.signIn!;
    const jwt = authOptions.callbacks!.jwt!;
    const oauthUser = { id: p.sub, name: p.name, email: p.email };
    const account = { provider: "google", type: "oauth" as const, providerAccountId: p.sub };
    expect(await signIn({ user: oauthUser, account, profile: p })).toBe(true);
    const local = await db.user.findUniqueOrThrow({ where: { googleSubject: p.sub } });
    const token = await jwt({ token: { sub: p.sub, picture: "https://example.test/image" }, user: oauthUser, account, profile: p });
    expect(token).toMatchObject({ uid: local.id, sub: local.id, version: local.sessionVersion, name: local.name, email: local.email });
    expect(token.picture).toBeUndefined();
    await db.user.update({ where: { id: local.id }, data: { active: false } });
    expect(await signIn({ user: oauthUser, account, profile: p })).toBe("/login?error=AccountInactive");
  });
});
