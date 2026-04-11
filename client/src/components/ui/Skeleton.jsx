export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="border-b border-border px-6 py-3 flex gap-8">
        {Array(cols).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="px-6 py-4 flex gap-8 border-b border-border last:border-0">
          {Array(cols).fill(0).map((_, j) => (
            <Skeleton key={j} className="h-4 w-24" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 3 }) {
  return (
    <div className="space-y-3">
      {Array(items).fill(0).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
