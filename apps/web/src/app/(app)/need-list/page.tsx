import { redirect } from "next/navigation";

export default function NeedListPage() {
  redirect("/lists?tab=needs");
}
