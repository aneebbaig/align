"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreOptions } from "@/components/shared/form-section";

/** Collapsed "more options": notes, regret-buy flag (expenses) and recurring + frequency. */
export function ExtraOptions({
  notesProps, showRegret, regret, onRegret, recurring, onRecurring, frequency, onFrequency,
}: {
  notesProps: React.ComponentProps<typeof Textarea>;
  showRegret: boolean;
  regret: boolean;
  onRegret: (v: boolean) => void;
  recurring: boolean;
  onRecurring: (v: boolean) => void;
  frequency: string;
  onFrequency: (v: string) => void;
}) {
  return (
    <MoreOptions>
      <div className="space-y-1">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" rows={2} placeholder="Additional details..." {...notesProps} />
      </div>

      {showRegret && (
        <div className="flex items-center gap-2">
          <Checkbox id="regret" checked={regret} onCheckedChange={(v) => onRegret(!!v)} />
          <Label htmlFor="regret" className="cursor-pointer">Regret buy - wish I hadn't</Label>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Checkbox id="recurring" checked={recurring} onCheckedChange={(v) => onRecurring(!!v)} />
        <Label htmlFor="recurring" className="cursor-pointer">Recurring transaction</Label>
      </div>
      {recurring && (
        <div className="space-y-1">
          <Label>Frequency</Label>
          <Select onValueChange={onFrequency} defaultValue={frequency}>
            <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Recurring transactions need to be added manually each month.</p>
        </div>
      )}
    </MoreOptions>
  );
}
