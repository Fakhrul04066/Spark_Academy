import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { GoogleSignInError, resolveGoogleStudent } from "@/services/google-signin";
import { compare } from "bcryptjs";
import { db } from "./db";
import { check, limit, hashToken } from "./security";
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { scope: "openid email profile", prompt: "select_account" } },
    })] : []),
    Credentials({
      name: "Spark Academy",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(c, req) {
        if (
          !c?.email ||
          c.email.length > 254 ||
          !c.password ||
          c.password.length > 128
        )
          return null;
        try {
          await limit(
            `login-ip:${hashToken(
              String(req.headers?.["x-forwarded-for"] || "local")
                .split(",")[0]
                .trim(),
            )}`,
            60,
          );
          const identifier = c.email.toLowerCase().trim();
          const email = identifier.includes("@")
            ? identifier
            : `${identifier.replace(/[\s()-]/g, "").replace(/^\+?880/, "0")}@phone.spark.invalid`;
          await limit(`login:${email}`, 10);
          const u = await db.user.findUnique({ where: { email } });
          const ok = await compare(
            c.password,
            u?.passwordHash ||
              "$2b$12$abcdefghijklmnopqrstuuCglqTiZtqj/G.c7AlMxmAGELqyPG4e",
          );
          if (!u || !ok || !u.active) return null;
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            version: u.sessionVersion,
          };
        } catch (error) {
          if (
            error instanceof Error &&
            /database server|P1001|P1002|P1017|connection/i.test(error.message)
          )
            throw new Error("DatabaseUnavailable");
          if (
            error instanceof Error &&
            error.message.includes("Too many requests")
          )
            throw new Error("TooManyAttempts");
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      try {
        await resolveGoogleStudent(profile);
        return true;
      } catch (error) {
        const code = error instanceof GoogleSignInError ? error.message : "GoogleUnavailable";
        return "/login?error=" + encodeURIComponent(code);
      }
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google") {
        const local = await db.user.findUniqueOrThrow({ where: { googleSubject: String((profile as { sub?: string })?.sub || "") } });
        check(local.active, 403, "Account inactive");
        token.uid = local.id;
        token.sub = local.id;
        token.version = local.sessionVersion;
        token.name = local.name;
        token.email = local.email;
        delete token.picture;
        return token;
      }
      if (user) {
        token.uid = user.id;
        token.version = (user as unknown as { version: number }).version;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { id: string; version: number }).id =
          String(token.uid);
        (session.user as unknown as { version: number }).version = Number(
          token.version,
        );
      }
      return session;
    },
  },
};
export async function currentUser() {
  const s = await getServerSession(authOptions);
  const identity = s?.user as { id?: string; version?: number } | undefined;
  if (!identity?.id) return null;
  const u = await db.user.findUnique({
    where: { id: identity.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      sessionVersion: true,
      emailReminders: true,
    },
  });
  return u?.active && u.sessionVersion === identity.version ? u : null;
}
export async function requireUser() {
  const u = await currentUser();
  check(u, 401, "Please sign in");
  return u;
}
export type Actor = NonNullable<Awaited<ReturnType<typeof currentUser>>>;
export async function batchIds(u: Actor) {
  if (u.role === "ADMIN")
    return (await db.batch.findMany({ select: { id: true } })).map((b) => b.id);
  if (u.role === "TEACHER")
    return [
      ...new Set(
        (
          await db.teacherAssignment.findMany({
            where: { userId: u.id },
            select: { batchId: true },
          })
        ).map((b) => b.batchId),
      ),
    ];
  return (
    await db.enrollment.findMany({
      where: { userId: u.id },
      select: { batchId: true },
    })
  ).map((b) => b.batchId);
}
export async function academicAccess(
  u: Actor,
  batchId: string,
  subjectId?: string,
) {
  if (u.role === "ADMIN") return;
  check((await batchIds(u)).includes(batchId));
  if (u.role === "TEACHER" && subjectId)
    check(
      await db.teacherAssignment.findFirst({
        where: { userId: u.id, batchId, subjectId },
      }),
    );
}
