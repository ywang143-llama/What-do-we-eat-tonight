import { Loader2 } from "lucide-react";

export function PageLoading({ label = "正在打开厨房…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-soft">
      <Loader2 className="size-6 animate-spin text-terracotta" />
      <p className="text-[12px]">{label}</p>
    </div>
  );
}

export function DishGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[22px] border border-line/70 bg-paper"
        >
          <div className="aspect-[4/3] animate-pulse bg-cream-deep/80" />
          <div className="space-y-2 p-3">
            <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-cream-deep" />
            <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-cream-deep/70" />
            <div className="mt-3 h-10 animate-pulse rounded-xl bg-cream-deep/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
