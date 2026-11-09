"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeddingOverviewTab } from "./wedding-overview-tab";
import { WeddingEventsTab } from "./wedding-events-tab";
import { WeddingExpensesTab } from "./wedding-expenses-tab";
import { WeddingPlan } from "./wedding-types";

export function WeddingDetailClient({ plan, baseSymbol = "Rs" }: { plan: WeddingPlan; baseSymbol?: string }) {
  return (
    <div className="space-y-6">
      <Link
        href="/wedding"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Wedding Plans
      </Link>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({plan.expenses.length})</TabsTrigger>
          <TabsTrigger value="events">Events ({plan.events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <WeddingOverviewTab plan={plan} baseSymbol={baseSymbol} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <WeddingExpensesTab plan={plan} baseSymbol={baseSymbol} />
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <WeddingEventsTab plan={plan} baseSymbol={baseSymbol} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
