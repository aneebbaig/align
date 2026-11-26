"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateNotificationPreferences } from "@/actions/users";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserSettings } from "@/components/settings/settings-types";

export function NotificationsTab({ settings, emailConfigured }: { settings: UserSettings | null; emailConfigured: boolean }) {
  // Notifications state
  const [notifications, setNotifications] = useState({
    notifyBudgetWarning: settings?.notifyBudgetWarning ?? true,
    notifyDoomSpending: settings?.notifyDoomSpending ?? true,
    notifyLoanDue: settings?.notifyLoanDue ?? true,
    notifyDailyDigest: settings?.notifyDailyDigest ?? true,
    notifyDigestTasks: settings?.notifyDigestTasks ?? true,
    notifyDigestBudget: settings?.notifyDigestBudget ?? true,
    notifyDigestFinancials: settings?.notifyDigestFinancials ?? true,
  });
  const [savingNotif, setSavingNotif] = useState(false);
  async function handleSaveNotifications() {
    setSavingNotif(true);
    const result = await updateNotificationPreferences(notifications);
    if (result.success) toast.success("Notification preferences saved!");
    else toast.error(result.error ?? "Failed");
    setSavingNotif(false);
  }

  return (
    <>
      <TabsContent forceMount value="notifications" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>Gmail SMTP status for sending alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {emailConfigured ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email configured</p>
                    <p className="text-xs text-muted-foreground">Alerts will be sent via Gmail SMTP</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email not configured</p>
                    <p className="text-xs text-muted-foreground">
                      Add <code className="bg-muted px-1 rounded">GMAIL_USER</code> and <code className="bg-muted px-1 rounded">GMAIL_APP_PASSWORD</code> to <code className="bg-muted px-1 rounded">.env.local</code> to enable alerts.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real-time Alerts</CardTitle>
            <CardDescription>Immediate emails triggered when you add an expense</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Budget warnings</p>
                <p className="text-xs text-muted-foreground">Email when a category hits 85% or exceeds 100% of budget</p>
              </div>
              <Switch
                checked={notifications.notifyBudgetWarning}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyBudgetWarning: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Doom spending</p>
                <p className="text-xs text-muted-foreground">Email when you add 3+ expenses within 2 hours</p>
              </div>
              <Switch
                checked={notifications.notifyDoomSpending}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDoomSpending: v }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Digest Email</CardTitle>
                <CardDescription>Morning summary sent at 7 AM - choose what to include</CardDescription>
              </div>
              <Switch
                checked={notifications.notifyDailyDigest}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDailyDigest: v }))}
              />
            </div>
          </CardHeader>
          <CardContent className={cn("space-y-5", !notifications.notifyDailyDigest && "opacity-50 pointer-events-none")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tasks</p>
                <p className="text-xs text-muted-foreground">Overdue tasks and tasks due today</p>
              </div>
              <Switch
                checked={notifications.notifyDigestTasks}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDigestTasks: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Loan reminders</p>
                <p className="text-xs text-muted-foreground">Loans due within the next 7 days</p>
              </div>
              <Switch
                checked={notifications.notifyLoanDue}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyLoanDue: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Budget alerts</p>
                <p className="text-xs text-muted-foreground">Categories at or over 80% of monthly budget</p>
              </div>
              <Switch
                checked={notifications.notifyDigestBudget}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDigestBudget: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Financial health</p>
                <p className="text-xs text-muted-foreground">Emergency fund status, missing income, end-of-month summary</p>
              </div>
              <Switch
                checked={notifications.notifyDigestFinancials}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDigestFinancials: v }))}
              />
            </div>
            <Button onClick={handleSaveNotifications} disabled={savingNotif}>
              {savingNotif ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
}
