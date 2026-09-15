import { Skeleton } from "@/components/ui/skeleton";

export default function KitchenLoading() {
  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 bg-zinc-800" />
          <Skeleton className="h-8 w-48 bg-zinc-800" />
        </div>
        <Skeleton className="h-10 w-28 bg-zinc-800" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} className="space-y-4">
            <Skeleton className="h-6 w-32 bg-zinc-800" />
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <Skeleton className="h-10 w-24 bg-zinc-800" />
                  <Skeleton className="mt-4 h-4 w-full bg-zinc-800" />
                  <Skeleton className="mt-2 h-4 w-3/4 bg-zinc-800" />
                  <Skeleton className="mt-5 h-12 w-full bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
