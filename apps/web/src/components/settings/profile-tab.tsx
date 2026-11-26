"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { ShowInMenuCard } from "@/components/settings/show-in-menu-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateUserSettings } from "@/actions/settings";
import type { UserSettings } from "@/components/settings/settings-types";

const DATE_FORMATS = [
  { value: "dd/MM/yyyy", label: "DD/MM/YYYY (31/01/2025)" },
  { value: "MM/dd/yyyy", label: "MM/DD/YYYY (01/31/2025)" },
  { value: "yyyy-MM-dd", label: "YYYY-MM-DD (2025-01-31)" },
  { value: "dd MMM yyyy", label: "DD MMM YYYY (31 Jan 2025)" },
];

const WEEK_STARTS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 6, label: "Saturday" },
];

export function ProfileTab({ settings, hiddenSections }: { settings: UserSettings | null; hiddenSections: string[] }) {
  const [isPending, startTransition] = useTransition();

  // Profile state
  const [profile, setProfile] = useState({
    name: settings?.name ?? "",
    dateFormat: settings?.dateFormat ?? "dd/MM/yyyy",
    firstDayOfWeek: settings?.firstDayOfWeek ?? 1,
    emergencyFundMonths: settings?.emergencyFundMonths ?? 6,
  });
  function handleSaveProfile() {
    startTransition(async () => {
      const result = await updateUserSettings(profile);
      if (result.success) toast.success("Profile updated!");
      else toast.error(result.error ?? "Failed to save");
    });
  }

  return (
    <>
      <TabsContent forceMount value="profile" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile & Preferences</CardTitle>
            <CardDescription>Update your name, currency, and display preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={settings?.email ?? ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
            <div>
              <Label>Date Format</Label>
              <Select onValueChange={(v) => setProfile((p) => ({ ...p, dateFormat: v }))} defaultValue={profile.dateFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Week Starts On</Label>
              <Select onValueChange={(v) => setProfile((p) => ({ ...p, firstDayOfWeek: Number(v) }))} defaultValue={String(profile.firstDayOfWeek)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEK_STARTS.map((w) => <SelectItem key={w.value} value={String(w.value)}>{w.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Emergency Fund Target (months)</Label>
              <Select onValueChange={(v) => setProfile((p) => ({ ...p, emergencyFundMonths: Number(v) }))} defaultValue={String(profile.emergencyFundMonths)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8, 9, 10, 12].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} months</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Target months of expenses to save in your emergency fund. 6 months is the standard recommendation.
              </p>
            </div>
            <Button onClick={handleSaveProfile} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
        <ShowInMenuCard initialHidden={hiddenSections} />
      </TabsContent>
    </>
  );
}
