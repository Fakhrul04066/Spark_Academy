import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/integrations";
import { check, hashToken, HttpError, limit, sameOrigin } from "@/lib/security";
import { signupDetails, signupEmail } from "@/lib/signup-schema";

export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), email: signupEmail }).strict(),
  signupDetails.extend({
    action: z.literal("verify"),
    code: z.string().regex(/^\d{6}$/),
  }).strict(),
]);

function digest(secret: string, nonce: string, code: string) {
  return createHmac("sha256", secret).update(`signup:${nonce}:${code}`).digest("hex");
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const body = await req.text();
    check(body.length <= 4096, 413, "Request is too large");
    const data = requestSchema.parse(JSON.parse(body));
    const secret = process.env.NEXTAUTH_SECRET;
    check(secret, 503, "Signup is temporarily unavailable.");
    const emailKey = hashToken(data.email);
    const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
    const ipKey = hashToken(ip);

    if (data.action === "send") {
      const local = process.env.NODE_ENV !== "production" && process.env.EMAIL_MODE === "local";
      check(local || (process.env.RESEND_API_KEY && process.env.EMAIL_FROM), 503,
        "Email verification is temporarily unavailable. Please try again later.");
      await limit(`signup-send-ip:${ipKey}`, 10, 3600);
      await limit(`signup-send-email:${emailKey}`, 3, 3600);
      const existing = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
      if (existing) return Response.json({ sent: true });
      // Leave headroom in the shared free-tier daily quota for password resets.
      const day = new Date().toISOString().slice(0, 10);
      await limit(`signup-send-daily:${day}`, 80, 86400);
      const nonce = randomUUID();
      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const verification = {
        nonce,
        codeHash: digest(secret, nonce, code),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      };
      await db.signupVerification.deleteMany({ where: { expiresAt: { lte: new Date() } } });
      await db.signupVerification.upsert({
        where: { email: data.email },
        create: { email: data.email, ...verification },
        update: verification,
      });
      try {
        await sendEmail(data.email, "Spark Academy verification code",
          `Your Spark Academy verification code is ${code}. It expires in 10 minutes.`,
          `signup-${nonce}`);
      } catch {
        await db.signupVerification.deleteMany({ where: { email: data.email, nonce } });
        throw new HttpError(503, "Could not send the verification code. Please try again later.");
      }
      return Response.json({ sent: true });
    }

    await limit(`signup-verify-ip:${ipKey}`, 30, 600);
    await limit(`signup-verify-email:${emailKey}`, 8, 600);
    const verification = await db.signupVerification.findUnique({ where: { email: data.email } });
    const invalidCode = "The verification code is invalid or expired.";
    check(verification && verification.expiresAt > new Date(), 400, invalidCode);
    check(timingSafeEqual(
      Buffer.from(verification.codeHash, "hex"),
      Buffer.from(digest(secret, verification.nonce, data.code), "hex"),
    ), 400, invalidCode);
    const passwordHash = await hash(data.password, 12);
    await db.$transaction(async (tx) => {
      const claimed = await tx.signupVerification.deleteMany({
        where: { email: data.email, nonce: verification.nonce, expiresAt: { gt: new Date() } },
      });
      check(claimed.count === 1, 400, invalidCode);
      await tx.user.create({
        data: { email: data.email, name: data.name, phone: data.phone, passwordHash, role: "STUDENT" },
      });
    });
    return Response.json({ created: true }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError)
      return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return Response.json({ error: "Check the information you entered and try again." }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return Response.json({ error: "This email already has an account. Please log in." }, { status: 409 });
    console.error("Student signup failed", error instanceof Error ? error.name : "Unknown error");
    return Response.json({ error: "Signup is temporarily unavailable." }, { status: 500 });
  }
}
