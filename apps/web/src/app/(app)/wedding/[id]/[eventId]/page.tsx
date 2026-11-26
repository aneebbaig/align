import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeddingPlan } from "@/actions/wedding";
import { getCurrencies } from "@/lib/currency-helpers";
import { EventPage } from "@/components/wedding/event-page";

export const metadata: Metadata = { title: "Wedding Event" };

export default async function WeddingEventPage({ params }: { params: Promise<{ id: string; eventId: string }> }) {
  const { id, eventId } = await params;
  const [plan, currencies] = await Promise.all([getWeddingPlan(id), getCurrencies()]);
  if (!plan) notFound();
  if (eventId !== "general" && !plan.events.some((e) => e.id === eventId)) notFound();
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  return (
    <div className="max-w-3xl mx-auto">
      <EventPage plan={plan as any} eventId={eventId} baseSymbol={baseSymbol} />
    </div>
  );
}
