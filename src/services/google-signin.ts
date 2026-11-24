import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

const claims = z.object({
  sub: z.string().min(1).max(255).regex(/^\S+$/),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  email_verified: z.literal(true),
  name: z.string().trim().max(500).optional(),
  hd: z.string().trim().min(1).max(254).optional(),
});
export class GoogleSignInError extends Error {}

// Only call with the OIDC claims already verified by NextAuth's Google provider.
export async function resolveGoogleStudent(profile: unknown) {
  const parsed = claims.safeParse(profile);
  if (!parsed.success) throw new GoogleSignInError("GoogleEmailUnverified");
  const data = parsed.data;
  const authoritativeEmail = data.email.endsWith("@gmail.com") || data.email.endsWith("@googlemail.com") || !!data.hd;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const linked = await tx.user.findUnique({ where: { googleSubject: data.sub } });
        if (linked) {
          if (!linked.active) throw new GoogleSignInError("AccountInactive");
          return linked;
        }
        const existing = await tx.user.findUnique({ where: { email: data.email } });
        if (existing) {
          if (!existing.active) throw new GoogleSignInError("AccountInactive");
          // Google is not authoritative for third-party email addresses. Never
          // silently link privileged accounts or overwrite another Google identity.
          if (!authoritativeEmail || existing.role !== "STUDENT" || existing.googleSubject)
            throw new GoogleSignInError("GoogleLinkRequired");
          const claimed = await tx.user.updateMany({
            where: { id: existing.id, googleSubject: null, active: true, role: "STUDENT" },
            data: { googleSubject: data.sub },
          });
          if (!claimed.count) throw new GoogleSignInError("GoogleLinkRequired");
          await tx.auditLog.create({ data: { actorId: existing.id, action: "account.google.link", resource: existing.id } });
          return tx.user.findUniqueOrThrow({ where: { id: existing.id } });
        }
        const user = await tx.user.create({ data: {
          email: data.email, googleSubject: data.sub, name: data.name || data.email.split("@")[0], role: "STUDENT",
          // Google users have no known password; the existing reset flow lets
          // them set one later without introducing a shared/default password.
          passwordHash: await hash(randomBytes(32).toString("base64url"), 12),
        } });
        await tx.auditLog.create({ data: { actorId: user.id, action: "account.google.create", resource: user.id } });
        return user;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code) && attempt < 2) continue;
      throw error;
    }
  }
  throw new GoogleSignInError("GoogleUnavailable");
}
