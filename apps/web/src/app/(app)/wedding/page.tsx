import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getWeddingPlans } from "@/actions/wedding";
import { getCurrencies } from "@/lib/currency-helpers";
import { WeddingList } from "@/components/wedding/wedding-list";

export const metadata: Metadata = { title: "Weddings" };

export default async function WeddingsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams;
  const [plans, currencies] = await Promise.all([getWeddingPlans(), getCurrencies()]);

  // One live wedding: skip the list. "?all=1" always shows it.
  const live = plans.filter((p) => p.status !== "DONE");
  if (!all && live.length === 1) redirect(`/wedding/${live[0].id}`);

  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";
  return (
    <div className="max-w-3xl mx-auto">
      <WeddingList plans={plans} baseSymbol={baseSymbol} />
    </div>
  );
}
