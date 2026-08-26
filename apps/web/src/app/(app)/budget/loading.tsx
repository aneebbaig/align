export default function BudgetLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Month selector + summary */}
      <div className="flex items-center gap-4">
        <div className="h-9 w-40 bg-muted rounded-lg" />
        <div className="h-9 w-28 bg-muted rounded-lg" />
      </div>

      {/* Ready-to-assign banner */}
      <div className="h-16 bg-muted rounded-xl" />

      {/* Category rows */}
      <div className="bg-card border rounded-xl divide-y">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-4 py-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-muted rounded-md" />
                <div className="h-3.5 w-24 bg-muted rounded" />
              </div>
              <div className="h-3.5 w-20 bg-muted rounded" />
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
