import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getWeddingPlan } from "@/actions/wedding";
import { getCurrencies } from "@/lib/currency-helpers";
import { WeddingOverview } from "@/components/wedding/wedding-overview";

export const metadata: Metadata = { title: "Wedding Plan" };

export default async function WeddingPlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ event?: string; expense?: string }> }) {
  const { id } = await params;
  const { event, expense } = await searchParams;
  const [plan, currencies] = await Promise.all([getWeddingPlan(id), getCurrencies()]);
  if (!plan) notFound();

  // Old links: /wedding/[id]?event=<id> now lives on its own page.
  if (event && plan.events.some((e) => e.id === event)) {
    redirect(`/wedding/${id}/${event}${expense ? `?expense=${encodeURIComponent(expense)}` : ""}`);
  }

  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";
  return (
    <div className="max-w-3xl mx-auto">
      <WeddingOverview plan={plan} baseSymbol={baseSymbol} />
    </div>
  );
}
