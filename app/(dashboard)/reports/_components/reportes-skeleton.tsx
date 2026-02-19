export function ReportesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>

      {/* Low stock section */}
      <div className="space-y-2">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="h-32 rounded-xl bg-muted" />
      </div>

      {/* Products table */}
      <div className="space-y-2">
        <div className="h-5 w-48 rounded bg-muted" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
