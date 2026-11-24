import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function ContinueAfterSignIn() {
  const user = await currentUser();
  redirect(user ? "/" + user.role.toLowerCase() : "/login");
}
