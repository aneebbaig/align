import { Metadata } from "next";
import { getWeddingPlans } from "@/actions/wedding";
import { getCurrencies } from "@/lib/currency-helpers";
import { WeddingClient } from "@/components/wedding/wedding-client";

export const metadata: Metadata = { title: "Wedding" };

export default async function WeddingPage() {
  const [plans, currencies] = await Promise.all([getWeddingPlans(), getCurrencies()]);
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  return (
    <div className="max-w-5xl mx-auto">
      <WeddingClient plans={plans as any} baseSymbol={baseSymbol} />
    </div>
  );
}
