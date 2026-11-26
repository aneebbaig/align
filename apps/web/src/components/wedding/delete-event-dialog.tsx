"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WeddingEvent, getEventInfo } from "./wedding-types";

export type EventRemovalChoice = { moveTo?: string; deleteExpenses?: boolean };

/**
 * Confirm deleting an event. When it has expenses they must go somewhere: move them to
 * another event (default: the first other one) or delete them with it.
 */
export function DeleteEventDialog({ open, onOpenChange, event, others, expenseCount, loading, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; event: WeddingEvent; others: WeddingEvent[];
  expenseCount: number; loading?: boolean; onConfirm: (choice: EventRemovalChoice) => void;
}) {
  const [mode, setMode] = useState<"move" | "delete">("move");
  const [target, setTarget] = useState<string | null>(null);
  const moveTo = others.find((e) => e.id === target)?.id ?? others[0]?.id;
  const canMove = others.length > 0;
  const effective = canMove ? mode : "delete";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {event.name}?</DialogTitle>
          <DialogDescription>
            {expenseCount === 0 ? "It has no expenses. This can't be undone."
              : `This event has ${expenseCount} expense${expenseCount === 1 ? "" : "s"}.${canMove ? " Choose what happens to them." : " It is your only event, so they will be deleted with it."}`}
          </DialogDescription>
        </DialogHeader>
        {expenseCount > 0 && canMove && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="What happens to its expenses">
              {([["move", "Move them"], ["delete", "Delete them too"]] as const).map(([v, label]) => (
                <button key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)}
                  className={cn("h-9 rounded-md border text-sm transition-colors", mode === v ? "border-primary bg-primary/10 font-medium" : "border-border text-muted-foreground hover:text-foreground")}>{label}</button>
              ))}
            </div>
            {mode === "move" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">Move them to:</span>
                <Select value={moveTo} onValueChange={setTarget}>
                  <SelectTrigger aria-label="Move expenses to"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {others.map((ev) => <SelectItem key={ev.id} value={ev.id}>{getEventInfo(ev.type).emoji} {ev.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button
            variant="destructive" disabled={loading}
            onClick={() => onConfirm(expenseCount === 0 ? {} : effective === "move" ? { moveTo } : { deleteExpenses: true })}
          >
            {loading ? "Deleting..." : expenseCount > 0 && effective === "delete" ? "Delete event and expenses" : "Delete event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
