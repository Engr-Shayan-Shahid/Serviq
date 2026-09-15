import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerMenuLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Skeleton className="size-12 rounded-xl bg-white/20" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 bg-white/20" />
            <Skeleton className="h-3 w-24 bg-white/15" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 px-4 py-5 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
