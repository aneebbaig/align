export default function ExpensesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Filter bar */}
      <div className="flex gap-3">
        <div className="h-9 w-36 bg-muted rounded-lg" />
        <div className="h-9 w-28 bg-muted rounded-lg" />
        <div className="h-9 flex-1 bg-muted rounded-lg" />
      </div>

      {/* Transaction rows */}
      <div className="bg-card border rounded-xl divide-y">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-9 w-9 bg-muted rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 bg-muted rounded" />
              <div className="h-2.5 w-1/4 bg-muted rounded" />
            </div>
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
