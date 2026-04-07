import { Skeleton } from '@/components/ui/skeleton';

interface TableLoadingProps {
  showFilters?: boolean;
  rows?: number;
  columns?: number;
}

export default function TableLoading({
  showFilters = true,
  rows = 5,
  columns = 5,
}: TableLoadingProps) {
  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-xl" />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="grid gap-4 border-b border-border p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-5 w-24" />
          ))}
        </div>

        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-4 p-4"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <Skeleton
                  key={`${rowIndex}-${columnIndex}`}
                  className={columnIndex === columns - 1 ? 'h-9 w-10 rounded-xl justify-self-center' : 'h-5 w-full max-w-[160px]'}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
