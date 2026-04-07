import { Skeleton } from '@/components/ui/skeleton';

export default function FormLoading() {
  return (
    <div className="p-4 sm:p-8">
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-8">
        <Skeleton className="h-8 w-56" />

        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-32 w-32 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className={index === 2 || index === 3 || index === 6 ? 'md:col-span-2 space-y-2' : 'space-y-2'}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4 max-w-4xl mx-auto">
          <Skeleton className="h-12 w-28 rounded-xl" />
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
