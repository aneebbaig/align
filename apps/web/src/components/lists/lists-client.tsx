"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NeedListClient } from "@/components/need-list/need-list-client";
import { WantListClient } from "@/components/want-list/want-list-client";
import { ClipboardList, ShoppingCart } from "lucide-react";

interface NeedListItem {
  id: string;
  name: string;
  description: string | null;
  estimatedCost: number | null;
  url: string | null;
  categoryHint: string | null;
  priority: string;
  status: string;
  addedAt: Date;
  doneAt: Date | null;
}

interface WantListItem {
  id: string;
  name: string;
  description: string | null;
  estimatedCost: number | null;
  url: string | null;
  categoryHint: string | null;
  status: string;
  addedAt: Date;
  remindAt: Date;
  boughtAt: Date | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  defaultTab: string;
  needItems: NeedListItem[];
  needHistory: NeedListItem[];
  wantCooling: WantListItem[];
  wantResurface: WantListItem[];
  wantHistory: WantListItem[];
  categories: Category[];
}

export function ListsClient({
  defaultTab,
  needItems,
  needHistory,
  wantCooling,
  wantResurface,
  wantHistory,
  categories,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`/lists?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs defaultValue={defaultTab} onValueChange={handleTabChange}>
      <TabsList className="mb-2">
        <TabsTrigger value="needs" className="gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          Need List
        </TabsTrigger>
        <TabsTrigger value="wants" className="gap-1.5">
          <ShoppingCart className="h-3.5 w-3.5" />
          Want List
        </TabsTrigger>
      </TabsList>

      <TabsContent value="needs">
        <NeedListClient items={needItems} history={needHistory} categories={categories} />
      </TabsContent>

      <TabsContent value="wants">
        <WantListClient
          cooling={wantCooling}
          resurface={wantResurface}
          history={wantHistory}
          categories={categories}
        />
      </TabsContent>
    </Tabs>
  );
}
