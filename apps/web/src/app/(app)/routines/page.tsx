import { Metadata } from "next";
import { getRoutinesPage } from "@/actions/routines";
import { RoutinesClient } from "@/components/routines/routines-client";

export const metadata: Metadata = { title: "Routines" };

export default async function RoutinesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const data = await getRoutinesPage(date);
  return (
    <div className="max-w-3xl mx-auto">
      <RoutinesClient data={data} />
    </div>
  );
}
