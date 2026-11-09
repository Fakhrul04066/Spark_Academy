import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GoogleAuth } from "google-auth-library";
import { HttpError } from "./security";
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  key: string,
) {
  if (
    process.env.EMAIL_MODE === "local" &&
    process.env.NODE_ENV !== "production"
  ) {
    await mkdir(".local/mail", { recursive: true });
    await writeFile(
      `.local/mail/${key.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`,
      JSON.stringify(
        {
          to,
          from: process.env.EMAIL_FROM || "Spark Academy",
          subject,
          text,
          delivery: "LOCAL_PREVIEW_ONLY",
        },
        null,
        2,
      ),
    );
    return "LOCAL_PREVIEW";
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new HttpError(503, "Email provider is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      text,
    }),
  });
  if (!response.ok)
    throw new Error(`Email provider rejected delivery (${response.status})`);
  return "SENT";
}
function storage() {
  if (
    !process.env.S3_BUCKET ||
    !process.env.S3_ACCESS_KEY_ID ||
    !process.env.S3_SECRET_ACCESS_KEY
  )
    throw new HttpError(503, "Private audio storage is not configured");
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "auto",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!process.env.S3_ENDPOINT,
  });
}
export async function uploadAudio(bytes: Buffer, mime: string) {
  const key = `audio/${randomUUID()}`;
  if (
    process.env.STORAGE_MODE === "local" &&
    process.env.NODE_ENV !== "production"
  ) {
    await mkdir(".local/audio", { recursive: true });
    await writeFile(`.local/${key}`, bytes);
    return key;
  }
  await storage().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: mime,
      ServerSideEncryption: "AES256",
    }),
  );
  return key;
}
export async function audioUrl(key: string) {
  return getSignedUrl(
    storage(),
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    { expiresIn: 120 },
  );
}
export async function localAudio(key: string) {
  if (
    process.env.STORAGE_MODE !== "local" ||
    process.env.NODE_ENV === "production"
  )
    return null;
  if (!/^audio\/[a-f0-9-]{36}$/.test(key))
    throw new HttpError(400, "Invalid audio reference");
  return readFile(`.local/${key}`);
}
export async function uploadAvatar(bytes: Buffer, mime: string) {
  const key = `avatars/${randomUUID()}`;
  if (
    process.env.STORAGE_MODE === "local" &&
    process.env.NODE_ENV !== "production"
  ) {
    await mkdir(".local/avatars", { recursive: true });
    await writeFile(`.local/${key}`, bytes);
    await writeFile(`.local/${key}.mime`, mime);
    return key;
  }
  await storage().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: mime,
      ServerSideEncryption: "AES256",
    }),
  );
  return key;
}
export async function localAvatar(key: string) {
  if (
    process.env.STORAGE_MODE !== "local" ||
    process.env.NODE_ENV === "production"
  )
    return null;
  if (!/^avatars\/[a-f0-9-]{36}$/.test(key))
    throw new HttpError(400, "Invalid image reference");
  return {
    bytes: await readFile(`.local/${key}`),
    mime: await readFile(`.local/${key}.mime`, "utf8"),
  };
}
export async function syncSheet(row: string[]) {
  if (
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY ||
    !process.env.GOOGLE_SPREADSHEET_ID
  )
    throw new HttpError(503, "Google Sheets is not configured");
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(process.env.GOOGLE_SPREADSHEET_ID)}/values`;
  const existing = await client.request<{ values?: string[][] }>({
    url: `${base}/Revisions!A:A`,
    timeout: 15000,
  });
  const index = existing.data.values?.findIndex((r) => r[0] === row[0]) ?? -1;
  if (index >= 0)
    await client.request({
      method: "PUT",
      url: `${base}/Revisions!A${index + 1}:I${index + 1}?valueInputOption=RAW`,
      timeout: 15000,
      data: { values: [row] },
    });
  else
    await client.request({
      method: "POST",
      url: `${base}/Revisions!A:I:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      timeout: 15000,
      data: { values: [row] },
    });
}
