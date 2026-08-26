"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="bg-card border rounded-xl p-8 max-w-md w-full space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          An unexpected error occurred while loading this page. Your data is safe - this is
          likely a temporary issue.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs text-muted-foreground/60">
              Error ID: {error.digest}
            </span>
          )}
        </p>

        <div className="flex gap-3">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard" className="gap-2 flex items-center">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
