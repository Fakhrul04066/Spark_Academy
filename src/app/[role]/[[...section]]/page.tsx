import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { navigation } from "@/lib/navigation";
import { Shell } from "@/components/shell";
import { Workspace } from "@/components/workspace";
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
  if (!navigation[key].some(([k]) => k === module) && module !== "attempt")
    notFound();
  return (
    <Shell role={key} name={user.name}>
      <Workspace
        role={key}
        name={user.name}
        module={module}
        recordId={section?.[1]}
      />
    </Shell>
  );
}
