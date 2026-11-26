"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SECTIONS } from "@/lib/hidden-sections";
import { setHiddenSections } from "@/actions/preferences";

export function ShowInMenuCard({ initialHidden }: { initialHidden: string[] }) {
  const [hidden, setHidden] = useState<string[]>(initialHidden);

  async function toggle(key: string, shown: boolean) {
    const prev = hidden;
    const next = shown ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(next);
    const result = await setHiddenSections(next);
    if (!result.success) {
      setHidden(prev);
      toast.error(result.error ?? "Failed to save");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Show in menu</CardTitle>
        <CardDescription>Only changes your own menu. Hidden pages still work if you open them by link.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {SECTIONS.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <Label htmlFor={`menu-${s.key}`} className="font-normal">{s.label}</Label>
            <Switch id={`menu-${s.key}`} checked={!hidden.includes(s.key)} onCheckedChange={(on) => toggle(s.key, on)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
