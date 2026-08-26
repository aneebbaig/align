import { redirect } from "next/navigation";

export default function WantListPage() {
  redirect("/lists?tab=wants");
}
