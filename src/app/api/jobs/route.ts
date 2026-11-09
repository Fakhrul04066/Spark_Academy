import { timingSafeEqual } from "node:crypto";
import { runJobs } from "@/services/revision";
export async function GET(req: Request) {
  const provided = Buffer.from(req.headers.get("authorization") || "");
  const wanted = Buffer.from(`Bearer ${process.env.CRON_SECRET || ""}`);
  if (
    !process.env.CRON_SECRET ||
    provided.length !== wanted.length ||
    !timingSafeEqual(provided, wanted)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await runJobs() });
}
