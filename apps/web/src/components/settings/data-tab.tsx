"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exportUserData } from "@/actions/settings";
import { Download, RefreshCw } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { Badge } from "@/components/ui/badge";
import type { Currency, RecurringTransaction } from "@/components/settings/settings-types";

export function DataTab({ currencies, recurringTransactions }: { currencies: Currency[]; recurringTransactions: RecurringTransaction[] }) {
  const [isPending, startTransition] = useTransition();
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  async function handleExport() {
    startTransition(async () => {
      const result = await exportUserData();
      if (!result.success) { toast.error(result.error); return; }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${APP_NAME.toLowerCase()}-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported!");
    });
  }

  return (
    <>
      <TabsContent forceMount value="data" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download all your data as a JSON backup file</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={isPending} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {isPending ? "Exporting..." : "Download Backup (JSON)"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Includes all transactions, budgets, planners, savings, loans, and tasks.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Recurring Transactions
            </CardTitle>
            <CardDescription>Transactions marked as recurring - add them manually each month</CardDescription>
          </CardHeader>
          <CardContent>
            {recurringTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recurring transactions set up yet.</p>
            ) : (
              <div className="space-y-2">
                {recurringTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tx.category.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{tx.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {tx.category.name} · Last added {format(new Date(tx.date), "dd MMM yyyy")}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {tx.recurringFrequency?.toLowerCase() ?? "recurring"}
                    </Badge>
                    <span className={`text-sm font-semibold shrink-0 ${tx.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                      {tx.type === "INCOME" ? "+" : "-"}{baseSymbol} {(tx.amount / 100).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
}
