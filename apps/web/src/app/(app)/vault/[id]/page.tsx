import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSurprise } from "@/actions/vault";
import { getCurrencies } from "@/lib/currency-helpers";
import { VaultDetailClient } from "@/components/vault/vault-detail-client";

export const metadata: Metadata = { title: "Surprise Detail" };

export default async function VaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [surprise, currencies] = await Promise.all([getSurprise(id), getCurrencies()]);
  if (!surprise) notFound();
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  return <VaultDetailClient surprise={surprise} baseSymbol={baseSymbol} />;
}
