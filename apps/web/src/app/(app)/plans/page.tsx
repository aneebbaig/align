import { Metadata } from "next";
import { getPlanners } from "@/actions/plan";
import { getWeddingPlans } from "@/actions/wedding";
import { getCurrencies } from "@/lib/currency-helpers";
import { PlansClient } from "@/components/plans/plans-client";

export const metadata: Metadata = { title: "Plans" };

export default async function PlannerPage() {
  const [planners, weddings, currencies] = await Promise.all([getPlanners(), getWeddingPlans(), getCurrencies()]);
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";
  return (
    <div className="max-w-5xl mx-auto">
      <PlansClient planners={planners} weddings={weddings as any} baseSymbol={baseSymbol} />
    </div>
  );
}
