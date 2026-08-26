import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/session";

export default async function RootPage() {
  const user = await getServerUser();
  if (user) redirect("/dashboard");
  redirect("/login");
}
