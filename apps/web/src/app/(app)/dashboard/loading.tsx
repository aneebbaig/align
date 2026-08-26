export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Overview cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border rounded-xl p-4 space-y-3">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-6 w-28 bg-muted rounded" />
            <div className="h-2.5 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart skeleton */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-44 bg-muted rounded-lg" />
        </div>

        {/* List skeleton */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <div className="h-4 w-40 bg-muted rounded" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 bg-muted rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 bg-muted rounded" />
                <div className="h-2.5 w-1/2 bg-muted rounded" />
              </div>
              <div className="h-4 w-14 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card border rounded-xl p-5 space-y-3">
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-2 w-full bg-muted rounded-full" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
