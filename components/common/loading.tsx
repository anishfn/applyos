import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/** Layout-matched skeletons, so nothing jumps when real data lands. */
export function MetricSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Surface key={index} className="p-3.5">
          <Skeleton className="h-2.5 w-20 rounded-full" />
          <Skeleton className="mt-3 h-6 w-14 rounded-lg" />
          <Skeleton className="mt-2 h-2 w-24 rounded-full" />
        </Surface>
      ))}
    </>
  );
}

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <Surface className={cn("overflow-hidden", className)}>
      <div className="border-b border-foreground/[0.06] px-4 py-3">
        <Skeleton className="h-3 w-32 rounded-full" />
      </div>
      <ul className="divide-y divide-foreground/[0.05]">
        {Array.from({ length: rows }).map((_, index) => (
          <li key={index} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-40 rounded-full" />
              <Skeleton className="mt-1.5 h-2.5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </li>
        ))}
      </ul>
    </Surface>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Skeleton className="h-6 w-48 rounded-lg" />
        <Skeleton className="mt-2 h-3 w-72 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ListSkeleton className="lg:col-span-7" />
        <ListSkeleton rows={4} className="lg:col-span-5" />
      </div>
    </div>
  );
}
