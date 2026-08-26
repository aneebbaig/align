export default function SavingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border rounded-xl p-4 space-y-3">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-6 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Pots grid */}
      <div>
        <div className="h-4 w-28 bg-muted rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="space-y-2">
                  <div className="h-3.5 w-24 bg-muted rounded" />
                  <div className="h-2.5 w-16 bg-muted rounded" />
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Investments section */}
      <div>
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="bg-card border rounded-xl divide-y">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-9 w-9 bg-muted rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 bg-muted rounded" />
                <div className="h-2.5 w-1/4 bg-muted rounded" />
              </div>
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
