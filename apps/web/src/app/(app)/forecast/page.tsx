import { Metadata } from "next";
import { getPlanner } from "@/actions/planner";
import { getCurrencies } from "@/lib/currency-helpers";
import { PlannerClient } from "@/components/planner/planner-client";

export const metadata: Metadata = { title: "Forecast" };

export default async function PlannerPage() {
  const [planner, currencies] = await Promise.all([getPlanner(), getCurrencies()]);
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";
  return (
    <div className="max-w-[1400px] mx-auto">
      <PlannerClient planner={planner} baseSymbol={baseSymbol} />
    </div>
  );
}
