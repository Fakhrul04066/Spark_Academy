import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const students = await db.user.count({ where: { role: "STUDENT", active: true } });
    return Response.json({ students }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({ students: null }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
