import { checkQaMedia, manageQaAccess, readQa, readQaDiscussion, saveQa, updateQaSignal, writeQaDiscussion } from "@/services/qa-access";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { ZodError, z } from "zod";
import { requireUser, academicAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  check,
  hashToken,
  HttpError,
  limit,
  sameOrigin,
  audit,
} from "@/lib/security";
import {
  audioUrl,
  localAudio,
  sendEmail,
  uploadAudio,
  uploadAvatar,
  localAvatar,
} from "@/lib/integrations";
import {
  getData,
  mutate,
  attemptAction,
  readAttempt,
} from "@/services/platform";
export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
async function handler(req: Request, ctx: Context) {
  try {
    const { path } = await ctx.params;
    const resource = path[0] === "revision-topics" ? "revision" : path[0];
    const url = new URL(req.url);
    const mutation = req.method !== "GET";
    if (mutation) sameOrigin(req);
    check(
      Number(req.headers.get("content-length") || 0) <= 6 * 1024 * 1024,
      413,
      "Request is too large",
    );
    if (resource === "password-reset") {
      check(req.method === "POST", 405, "Use POST");
      const body = await req.json();
      const data = z
        .object({
          email: z.email().optional(),
          token: z.string().max(200).optional(),
          password: z.string().min(12).max(128).optional(),
        })
        .strict()
        .parse(body);
      if (data.token && data.password) {
        const tokenHash = hashToken(data.token);
        const reset = await db.passwordReset.findUnique({
          where: { tokenHash },
        });
        check(
          reset && !reset.usedAt && reset.expiresAt > new Date(),
          400,
          "Reset link has expired",
        );
        await db.$transaction(async (tx) => {
          const claimed = await tx.passwordReset.updateMany({
            where: {
              id: reset.id,
              usedAt: null,
              expiresAt: { gt: new Date() },
            },
            data: { usedAt: new Date() },
          });
          check(claimed.count, 400, "Reset link has expired");
          await tx.user.update({
            where: { id: reset.userId },
            data: {
              passwordHash: await hash(data.password!, 12),
              sessionVersion: { increment: 1 },
            },
          });
          await tx.passwordReset.updateMany({
            where: { userId: reset.userId, usedAt: null },
            data: { usedAt: new Date() },
          });
        });
        return Response.json({ data: { saved: true } });
      }
      check(data.email, 400, "Email is required");
      await limit(`reset:${hashToken(data.email.toLowerCase())}`, 3, 3600);
      const user = await db.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (user?.active) {
        const token = randomBytes(32).toString("hex");
        await db.passwordReset.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 3600000),
          },
        });
        await sendEmail(
          user.email,
          "Spark Academy — Reset your password",
          `Reset your password: ${process.env.NEXTAUTH_URL}/reset-password?token=${token}`,
          `reset-${hashToken(token)}`,
        );
      }
      return Response.json({
        data: {
          message: "If the account exists, a reset link has been prepared.",
        },
      });
    }
    const u = await requireUser();
    if (mutation) await limit(`write:${u.id}`, 120, 60);
    check(
      ["GET", "POST", "PATCH", "DELETE"].includes(req.method),
      405,
      "Unsupported method",
    );
    if (resource === "qa") {
      const part = path[1];
      if (part === "comments") {
        if (req.method === "GET")
          return Response.json({ data: await readQaDiscussion(u, url.searchParams.get("questionId") || "", url.searchParams) }, {
            headers: { "Cache-Control": "private, no-store" },
          });
        check(req.method === "POST", 405, "Use POST.");
        await writeQaDiscussion(u, await req.json());
        return Response.json({ data: { saved: true } }, { status: 201 });
      }
      if (req.method === "GET" && !part)
        return Response.json({ data: await readQa(u, url.searchParams) }, {
          headers: { "Cache-Control": "private, no-store" },
        });
      check(part === "bookmark" || part === "signal" || part === "access", 404, "Q&A operation not found.");
      check(req.method === "POST", 405, "Use POST.");
      const body = await req.json();
      if (part === "bookmark") await saveQa(u, body);
      else if (part === "signal") await updateQaSignal(u, body);
      else await manageQaAccess(u, body);
      return Response.json({ data: { saved: true } });
    }
    if (resource === "question-images") {
      if (req.method === "POST") {
        check(u.role === "STUDENT");
        const form = await req.formData();
        const f = form.get("image");
        check(
          f instanceof File && f.size > 0 && f.size <= 2 * 1024 * 1024,
          400,
          "Image must be under 2 MB",
        );
        const bytes = Buffer.from(await f.arrayBuffer());
        check(
          (f.type === "image/png" &&
            bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
            (f.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216) ||
            (f.type === "image/webp" &&
              bytes.subarray(0, 4).toString() === "RIFF" &&
              bytes.subarray(8, 12).toString() === "WEBP"),
          400,
          "Use a valid PNG, JPEG or WebP image",
        );
        const key = await uploadAvatar(bytes, f.type);
        const attachment = await db.audioAttachment.create({
          data: { ownerId: u.id, key, mime: f.type, bytes: bytes.length },
          select: { id: true },
        });
        return Response.json({ data: attachment }, { status: 201 });
      }
      check(
        req.method === "GET" && path[1],
        405,
        "Unsupported image operation",
      );
      const attachment = await db.audioAttachment.findUniqueOrThrow({
        where: { id: path[1] },
        include: { imageQuestion: true, qaImage: { include: { question: true } } },
      });
      check(attachment.mime.startsWith("image/"), 404, "Image not found");
      const question = attachment.imageQuestion || attachment.qaImage?.question;
      if (u.role !== "ADMIN" && attachment.ownerId !== u.id) {
        check(question);
        await checkQaMedia(u, question);
      }
      const local = await localAvatar(attachment.key);
      if (local)
        return new Response(new Uint8Array(local.bytes), {
          headers: {
            "Content-Type": local.mime,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      return Response.redirect(await audioUrl(attachment.key), 302);
    }
    if (resource === "avatar") {
      if (req.method === "POST") {
        const form = await req.formData();
        const f = form.get("image");
        check(
          f instanceof File && f.size > 0 && f.size <= 2 * 1024 * 1024,
          400,
          "Profile image must be under 2 MB",
        );
        const bytes = Buffer.from(await f.arrayBuffer());
        check(
          (f.type === "image/png" &&
            bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
            (f.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216) ||
            (f.type === "image/webp" &&
              bytes.subarray(0, 4).toString() === "RIFF" &&
              bytes.subarray(8, 12).toString() === "WEBP"),
          400,
          "Use a valid PNG, JPEG or WebP image",
        );
        const key = await uploadAvatar(bytes, f.type);
        await db.user.update({ where: { id: u.id }, data: { avatarKey: key } });
        return Response.json({ data: { saved: true } }, { status: 201 });
      }
      check(req.method === "GET", 405, "Unsupported image operation");
      const user = await db.user.findUniqueOrThrow({
        where: { id: u.id },
        select: { avatarKey: true },
      });
      check(user.avatarKey, 404, "No profile photo uploaded");
      const local = await localAvatar(user.avatarKey);
      if (local)
        return new Response(new Uint8Array(local.bytes), {
          headers: {
            "Content-Type": local.mime,
            "Cache-Control": "private, no-store",
          },
        });
      return Response.redirect(await audioUrl(user.avatarKey), 302);
    }
    if (resource === "exams" && path[1] && req.method === "GET") {
      check(u.role !== "STUDENT");
      const exam = await db.exam.findUniqueOrThrow({
        where: { id: path[1] },
        include: {
          chapter: true,
          questions: {
            include: { options: { orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      });
      await academicAccess(u, exam.batchId, exam.chapter.subjectId);
      return Response.json(
        {
          data: {
            ...exam,
            questions: exam.questions.map((q) => ({
              text: q.text,
              marks: q.marks,
              correctOption: q.correctOption,
              options: q.options.map((o) => o.text),
            })),
          },
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (resource === "audio") {
      if (req.method === "POST") {
        const form = await req.formData();
        const file = form.get("audio");
        check(
          file instanceof File && file.size > 0 && file.size <= 3 * 1024 * 1024,
          400,
          "Audio must be under 3 MB",
        );
        const mime = file.type.split(";")[0];
        check(
          [
            "audio/webm",
            "audio/ogg",
            "audio/mp4",
            "audio/mpeg",
            "audio/wav",
          ].includes(mime),
          400,
          "Unsupported audio format",
        );
        const bytes = Buffer.from(await file.arrayBuffer());
        const valid =
          (mime === "audio/webm" &&
            bytes
              .subarray(0, 4)
              .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) ||
          (mime === "audio/ogg" &&
            bytes.subarray(0, 4).toString() === "OggS") ||
          (mime === "audio/mp4" &&
            bytes.subarray(4, 8).toString() === "ftyp") ||
          (mime === "audio/wav" &&
            bytes.subarray(0, 4).toString() === "RIFF") ||
          (mime === "audio/mpeg" &&
            (bytes.subarray(0, 3).toString() === "ID3" || bytes[0] === 255));
        check(valid, 400, "Audio content does not match its declared type");
        const key = await uploadAudio(bytes, mime);
        const a = await db.audioAttachment.create({
          data: { ownerId: u.id, key, mime, bytes: bytes.length },
          select: { id: true },
        });
        return Response.json({ data: a }, { status: 201 });
      }
      check(
        req.method === "GET" && path[1],
        405,
        "Unsupported audio operation",
      );
      const a = await db.audioAttachment.findUniqueOrThrow({
        where: { id: path[1] },
        include: { question: true, reply: { include: { question: true } } },
      });
      check(a.mime.startsWith("audio/"), 404, "Recording not found");
      const q = a.question || a.reply?.question;
      if (u.role !== "ADMIN" && a.ownerId !== u.id) {
        check(q);
        await checkQaMedia(u, q);
      }
      const local = await localAudio(a.key);
      if (local) {
        if (url.searchParams.get("stream") === "1")
          return new Response(new Uint8Array(local), {
            headers: {
              "Content-Type": a.mime,
              "Cache-Control": "private, no-store",
              "Content-Disposition": "inline",
            },
          });
        return Response.json(
          {
            data: {
              url: `/api/audio/${a.id}?stream=1`,
              storage: "LOCAL_DEVELOPMENT_ONLY",
            },
          },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      }
      const signedUrl = await audioUrl(a.key);
      if (url.searchParams.get("stream") === "1")
        return new Response(null, {
          status: 302,
          headers: { Location: signedUrl, "Cache-Control": "private, no-store" },
        });
      return Response.json(
        { data: { url: signedUrl } },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (resource === "exam-attempts" && path[1]) {
      if (req.method === "GET")
        return Response.json(
          { data: await readAttempt(u, path[1]) },
          { headers: { "Cache-Control": "no-store" } },
        );
      const body = await req.json();
      return Response.json({ data: await attemptAction(u, path[1], body) });
    }
    if (req.method === "GET") {
      const data = await getData(
        u,
        resource === "admin" && path[1] === "reports" ? "reports" : resource,
        url.searchParams,
      );
      return Response.json(
        {
          data,
          page: Number(url.searchParams.get("page")) || 1,
          pageSize: 20,
          ...(resource === "notifications"
            ? {
                unreadCount: await db.notification.count({
                  where: { userId: u.id, readAt: null },
                }),
              }
            : {}),
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const body = await req.json();
    const data = await mutate(u, resource, req.method, body);
    return Response.json(
      { data },
      { status: req.method === "POST" ? 201 : 200 },
    );
  } catch (e) {
    if (e instanceof HttpError)
      return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof ZodError)
      return Response.json(
        {
          error: e.issues
            .map((x) => `${x.path.join(".")}: ${x.message}`)
            .join("; "),
        },
        { status: 400 },
      );
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025")
        return Response.json({ error: "Record not found" }, { status: 404 });
      if (e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta.target.includes("teacherCode"))
        return Response.json({ error: "That Teacher ID is already in use." }, { status: 409 });
      if (e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta.target.includes("classNumber"))
        return Response.json({ error: "That class number is already in use for this teacher, batch, and subject." }, { status: 409 });
      if (["P2002", "P2003", "P2034"].includes(e.code))
        return Response.json(
          {
            error:
              "Conflicting record or record is still in use. Refresh and try again.",
          },
          { status: 409 },
        );
    }
    if (e instanceof SyntaxError || e instanceof TypeError)
      return Response.json({ error: "Invalid request data" }, { status: 400 });
    console.error(
      "API operation failed",
      e instanceof Error ? e.name : "Unknown error",
    );
    return Response.json(
      { error: "The operation could not be completed. Please try again." },
      { status: 500 },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
