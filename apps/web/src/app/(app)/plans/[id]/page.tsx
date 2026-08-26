import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlanner } from "@/actions/plan";
import { getFinancialPosition } from "@/actions/savings";
import { getCurrencies } from "@/lib/currency-helpers";
import { PlanDetailClient } from "@/components/plans/plan-detail-client";

export const metadata: Metadata = { title: "Planner Detail" };

export default async function PlannerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [planner, financialPosition, currencies] = await Promise.all([getPlanner(id), getFinancialPosition(), getCurrencies()]);
  if (!planner) notFound();
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  return <PlanDetailClient plan={planner} financialPosition={financialPosition} baseSymbol={baseSymbol} />;
}
