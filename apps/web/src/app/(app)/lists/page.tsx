import { Metadata } from "next";
import { getNeedList, getNeedListHistory } from "@/actions/need-list";
import { getWantList, getWantListHistory } from "@/actions/want-list";
import { getCategoriesByType } from "@/actions/settings";
import { ListsClient } from "@/components/lists/lists-client";

export const metadata: Metadata = { title: "Lists" };

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  const [needItems, needHistory, { cooling, resurface }, wantHistory, categories] =
    await Promise.all([
      getNeedList(),
      getNeedListHistory(),
      getWantList(),
      getWantListHistory(),
      getCategoriesByType("EXPENSE"),
    ]);

  return (
    <div className="max-w-5xl mx-auto">
      <ListsClient
        defaultTab={tab === "wants" ? "wants" : "needs"}
        needItems={needItems}
        needHistory={needHistory}
        wantCooling={cooling}
        wantResurface={resurface}
        wantHistory={wantHistory}
        categories={categories}
      />
    </div>
  );
}
