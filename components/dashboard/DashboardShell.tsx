"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { ownerSupabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  DASHBOARD_NAV,
  isDashboardNavActive,
} from "@/lib/dashboard-nav";
import type { Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageTransition } from "@/components/shared/animations";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, staff, restaurantId, loading, signOut } = useAuth(ownerSupabase);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setRestaurant(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data } = await ownerSupabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .maybeSingle();

      if (!cancelled) {
        setRestaurant((data as Restaurant | null) ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  async function handleLogout() {
    await signOut();
    router.replace("/auth/owner/login");
    router.refresh();
  }

  const initials =
    restaurant?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "RS";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090B] text-sm text-zinc-500">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] font-sans text-zinc-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-zinc-800 bg-[#09090B] md:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <Avatar className="size-10 ring-2 ring-white/90">
            {restaurant?.logo_url ? (
              <AvatarImage src={restaurant.logo_url} alt={restaurant.name} />
            ) : null}
            <AvatarFallback className="bg-zinc-800 text-sm font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-white">
              {restaurant?.name || "Your restaurant"}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {staff?.name || user?.email || "Owner"}
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          {DASHBOARD_NAV.map((item) => {
            const active = isDashboardNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {active ? (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 rounded-lg bg-zinc-800"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <Icon className="relative z-10 size-4 shrink-0" />
                <span className="relative z-10 tracking-tight">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-zinc-800 p-3">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#09090B] to-transparent"
            aria-hidden
          />
          <div className="relative mb-3 flex items-center gap-2 rounded-lg bg-zinc-900/80 px-3 py-2">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400">
              Active
            </span>
          </div>
          <Button
            variant="ghost"
            className="relative w-full justify-start gap-3 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            onClick={() => void handleLogout()}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-zinc-800 bg-[#09090B]/95 px-4 py-3 backdrop-blur md:hidden">
        <Avatar className="size-9 ring-1 ring-white/80">
          {restaurant?.logo_url ? (
            <AvatarImage src={restaurant.logo_url} alt={restaurant.name} />
          ) : null}
          <AvatarFallback className="bg-zinc-800 text-xs font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight text-white">
            {restaurant?.name || "Your restaurant"}
          </p>
          <p className="truncate text-xs uppercase tracking-[0.08em] text-zinc-500">
            Owner dashboard
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          onClick={() => void handleLogout()}
          aria-label="Log out"
        >
          <LogOut className="size-4" />
        </Button>
      </header>

      <div className="md:pl-[240px]">
        <main className="mx-auto max-w-7xl px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8">
          <PageTransition key={pathname}>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-[#09090B] pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-6">
          {DASHBOARD_NAV.map((item) => {
            const active = isDashboardNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors duration-150",
                    active ? "text-white" : "text-zinc-500"
                  )}
                >
                  {active ? (
                    <motion.div
                      layoutId="activeIndicatorMobile"
                      className="absolute inset-x-2 top-1 h-1 rounded-full bg-indigo-400"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                  <Icon className="size-5" />
                  <span className="max-w-full truncate leading-none tracking-tight">
                    {item.title.split(" ")[0]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
