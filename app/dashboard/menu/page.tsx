import Link from "next/link";
import { FolderTree, UtensilsCrossed } from "lucide-react";

export default function DashboardMenuPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-white">
          <span className="text-indigo-400" aria-hidden>
            ●
          </span>
          Menu
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage categories and items for your customer menu
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/menu/categories"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-all hover:border-zinc-600 hover:shadow-[0_0_0_1px_rgb(63_63_70),0_4px_24px_rgba(99,102,241,0.08)]"
        >
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
            <FolderTree className="size-5" />
          </div>
          <p className="text-base font-bold text-white">Categories</p>
          <p className="mt-1 text-sm text-zinc-500">
            Create, reorder, and schedule menu sections
          </p>
        </Link>

        <Link
          href="/dashboard/menu/items"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-all hover:border-zinc-600 hover:shadow-[0_0_0_1px_rgb(63_63_70),0_4px_24px_rgba(99,102,241,0.08)]"
        >
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <UtensilsCrossed className="size-5" />
          </div>
          <p className="text-base font-bold text-white">Items</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add dishes, prices, photos, and availability
          </p>
        </Link>
      </div>
    </div>
  );
}
