import { Skeleton } from "@/components/ui/skeleton";

export default function WaiterLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-36" />
          </div>
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </div>
      <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <Skeleton className="h-10 w-40" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-5 h-12 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
