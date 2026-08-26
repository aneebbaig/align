import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/session";
import { getSurprises } from "@/actions/vault";
import { getCurrencies } from "@/lib/currency-helpers";
import { VaultClient } from "@/components/vault/vault-client";

export const metadata: Metadata = { title: "Vault" };

export default async function VaultPage() {
  const session = await getServerUser();
  if (session?.role !== "SUPER_ADMIN") redirect("/dashboard");

  const [surprises, currencies] = await Promise.all([getSurprises(), getCurrencies()]);
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          🎁 Secret Vault
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your private surprise planner - only visible to you
        </p>
      </div>
      <VaultClient surprises={surprises} baseSymbol={baseSymbol} />
    </div>
  );
}
