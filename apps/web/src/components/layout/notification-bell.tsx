"use client";

import { useState, useEffect } from "react";
import { Bell, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/actions/notifications";

const STORAGE_KEY = "align-dismissed-notifications";

const config: Record<AppNotification["type"], { icon: React.ElementType; className: string }> = {
  error:   { icon: AlertTriangle, className: "text-red-500" },
  warning: { icon: AlertTriangle, className: "text-amber-500" },
  success: { icon: CheckCircle2,  className: "text-emerald-500" },
  info:    { icon: Info,          className: "text-blue-500" },
};

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    // Keep at most 100 entries to avoid unbounded growth
    const arr = [...ids].slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function NotificationBell({ notifications }: { notifications: AppNotification[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  const errorCount = visible.filter((n) => n.type === "error").length;
  const count = visible.length;

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }

  function dismissAll() {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const n of notifications) next.add(n.id);
      saveDismissed(next);
      return next;
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white leading-none",
              errorCount > 0 ? "bg-red-500" : "bg-amber-500"
            )}>
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {count > 0 && (
            <button
              onClick={dismissAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm font-medium">All clear!</p>
            <p className="text-xs text-muted-foreground mt-0.5">No alerts right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {visible.map((n) => {
              const { icon: Icon, className } = config[n.type];
              return (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 group">
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", className)} />
                  <p className="text-sm leading-snug flex-1">{n.message}</p>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
