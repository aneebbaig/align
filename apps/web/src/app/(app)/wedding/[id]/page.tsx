import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeddingPlan } from "@/actions/wedding";
import { getCurrencies } from "@/lib/currency-helpers";
import { WeddingDetailClient } from "@/components/wedding/wedding-detail-client";

export const metadata: Metadata = { title: "Wedding Plan" };

export default async function WeddingPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plan, currencies] = await Promise.all([getWeddingPlan(id), getCurrencies()]);
  if (!plan) notFound();
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  return (
    <div className="max-w-5xl mx-auto">
      <WeddingDetailClient plan={plan as any} currencies={currencies} baseSymbol={baseSymbol} />
    </div>
  );
}
