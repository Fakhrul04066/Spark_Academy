import { createHash } from "node:crypto";
import { db } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function check(
  value: unknown,
  status = 403,
  message = "Access denied",
): asserts value {
  if (!value) throw new HttpError(status, message);
}
export async function limit(key: string, max = 20, seconds = 900) {
  const now = new Date();
  const row = await db.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, resetAt: new Date(+now + seconds * 1000) },
    update: { count: { increment: 1 } },
  });
  if (row.resetAt < now) {
    await db.rateLimit.update({
      where: { key },
      data: { count: 1, resetAt: new Date(+now + seconds * 1000) },
    });
    return;
  }
  check(row.count <= max, 429, "Too many requests. Please try again later.");
}
export const hashToken = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  check(
    origin === new URL(process.env.NEXTAUTH_URL || req.url).origin,
    403,
    "Invalid request origin",
  );
}
export async function audit(actorId: string, action: string, resource: string) {
  await db.auditLog.create({ data: { actorId, action, resource } });
}
