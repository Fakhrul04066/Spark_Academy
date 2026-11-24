import { QaAccessForm, QaPage } from "@/components/qa-page";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { navigation } from "@/lib/navigation";
import { Shell } from "@/components/shell";
import { Workspace } from "@/components/workspace";
import { BillingAdmin } from "@/components/billing";
import { TeacherPayments } from "@/components/teacher-payments";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ role: string; section?: string[] }>;
}) {
  const { role, section } = await params;
  const key = role.toUpperCase() as keyof typeof navigation;
  if (!(key in navigation)) notFound();
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== key) redirect("/" + user.role.toLowerCase());
  const module = section?.[0] || "dashboard";
  if (key === "TEACHER" && module === "subjects") redirect("/teacher/profile");
  if (!navigation[key].some(([k]) => k === module) && module !== "attempt")
    notFound();
  const qa = module === "questions";
  const photo = await db.user.findUnique({ where: { id: user.id }, select: { avatarKey: true, updatedAt: true } });
  return (
    <Shell role={key} name={user.name} initialAvatar={photo?.avatarKey ? "/api/avatar?v=" + photo.updatedAt.getTime() : undefined}>
      {qa && key === "ADMIN" && <QaAccessForm batches={await db.batch.findMany({
        orderBy: { name: "asc" }, select: { id: true, name: true },
      })} />}
      {module === "payments" && key === "ADMIN" ? <BillingAdmin students={await db.user.findMany({
        where: { role: "STUDENT" }, orderBy: { name: "asc" }, select: { id: true, name: true, studentCode: true, email: true },
      })} /> : module === "teacher-payments" ? <TeacherPayments teachers={key === "ADMIN" ? await db.user.findMany({
        where: { role: "TEACHER" }, orderBy: { name: "asc" }, select: { id: true, name: true, teacherCode: true },
      }) : undefined} /> : qa ? <QaPage student={key === "STUDENT"} admin={key === "ADMIN"} /> : <Workspace
        role={key}
        name={user.name}
        module={module}
        recordId={section?.[1]}
      />}
    </Shell>
  );
}
