"use client";

import { CheckCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

/** "Was this planned?" screen shown before saving a big same-day expense. */
export function ImpulseStep({ symbol, amount, description, loading, onConfirm, onPark, onBack }: {
  symbol: string;
  amount: number;
  description: string;
  loading: boolean;
  onConfirm: () => void;
  onPark: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 p-5 text-center space-y-2">
        <div className="text-3xl">⏸️</div>
        <div className="font-bold text-lg text-foreground">Hold on - big spend!</div>
        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{symbol} {amount.toLocaleString()}</div>
        <p className="text-sm text-muted-foreground">
          Was <span className="font-medium">"{description}"</span> planned, or did it just pop into your head?
        </p>
      </div>
      <div className="space-y-3">
        <Button type="button" className="w-full" onClick={onConfirm} disabled={loading}>
          <CheckCircle className="h-4 w-4 mr-2" />Yes, it was planned - record it
        </Button>
        <Button type="button" variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50" onClick={onPark} disabled={loading}>
          <ShoppingCart className="h-4 w-4 mr-2" />Not sure - park it in Want List first
        </Button>
        <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={onBack}>
          Go back and edit
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground">The Want List lets you revisit this in 48 hours with a clearer head.</p>
    </div>
  );
}
