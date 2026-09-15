"use client";

import { useEffect, useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { ownerSupabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  formatCurrency,
  formatTime,
  startOfLocalDay,
  startOfLocalWeek,
} from "@/lib/format";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ScaleOnHover,
  StaggerContainer,
} from "@/components/shared/animations";

type TopItem = {
  name: string;
  quantity: number;
};

type OverviewData = {
  ordersToday: number;
  revenueToday: number;
  ordersWeek: number;
  revenueWeek: number;
  topItems: TopItem[];
  recentOrders: Order[];
};

const EMPTY: OverviewData = {
  ordersToday: 0,
  revenueToday: 0,
  ordersWeek: 0,
  revenueWeek: 0,
  topItems: [],
  recentOrders: [],
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "border-0 bg-amber-500/10 text-amber-400",
  preparing: "border-0 bg-blue-500/10 text-blue-400",
  ready: "border-0 bg-emerald-500/10 text-emerald-400",
  served: "border-0 bg-zinc-500/10 text-zinc-400",
};

export default function DashboardOverviewPage() {
  const { restaurantId, loading: authLoading } = useAuth(ownerSupabase);
  const [data, setData] = useState<OverviewData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!restaurantId) {
      setData(EMPTY);
      setLoading(false);
      return;
    }

    const supabase = ownerSupabase;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);

      const todayIso = startOfLocalDay().toISOString();
      const weekIso = startOfLocalWeek().toISOString();

      const [weekOrdersRes, recentRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total_amount, created_at, status, table_number")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", weekIso)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;

      if (weekOrdersRes.error || recentRes.error) {
        setError(
          weekOrdersRes.error?.message ||
            recentRes.error?.message ||
            "Failed to load overview"
        );
        setLoading(false);
        return;
      }

      const weekOrders = (weekOrdersRes.data || []) as Pick<
        Order,
        "id" | "total_amount" | "created_at" | "status" | "table_number"
      >[];

      const todayOrders = weekOrders.filter(
        (o) => new Date(o.created_at) >= new Date(todayIso)
      );

      const ordersToday = todayOrders.length;
      const revenueToday = todayOrders.reduce(
        (sum, o) => sum + Number(o.total_amount || 0),
        0
      );
      const ordersWeek = weekOrders.length;
      const revenueWeek = weekOrders.reduce(
        (sum, o) => sum + Number(o.total_amount || 0),
        0
      );

      const weekOrderIds = weekOrders.map((o) => o.id);
      let topItems: TopItem[] = [];

      if (weekOrderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from("order_items")
          .select("name, quantity, order_id")
          .in("order_id", weekOrderIds);

        if (cancelled) return;

        if (itemsError) {
          setError(itemsError.message);
          setLoading(false);
          return;
        }

        const counts = new Map<string, number>();
        for (const item of (items || []) as Pick<
          OrderItem,
          "name" | "quantity"
        >[]) {
          counts.set(
            item.name,
            (counts.get(item.name) || 0) + Number(item.quantity || 0)
          );
        }

        topItems = Array.from(counts.entries())
          .map(([name, quantity]) => ({ name, quantity }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);
      }

      if (cancelled) return;

      setData({
        ordersToday,
        revenueToday,
        ordersWeek,
        revenueWeek,
        topItems,
        recentOrders: (recentRes.data || []) as Order[],
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, authLoading]);

  const stats = useMemo(
    () => [
      {
        title: "Total Orders Today",
        value: data.ordersToday,
        format: "number" as const,
        hint: "Since midnight",
        iconBg: "bg-indigo-500/15 text-indigo-400",
        trend: "+12%",
        up: true,
      },
      {
        title: "Revenue Today",
        value: data.revenueToday,
        format: "currency" as const,
        hint: "Gross order total",
        iconBg: "bg-emerald-500/15 text-emerald-400",
        trend: "+8%",
        up: true,
      },
      {
        title: "Total Orders This Week",
        value: data.ordersWeek,
        format: "number" as const,
        hint: "Week starting Monday",
        iconBg: "bg-blue-500/15 text-blue-400",
        trend: "+5%",
        up: true,
      },
      {
        title: "Revenue This Week",
        value: data.revenueWeek,
        format: "currency" as const,
        hint: "Gross order total",
        iconBg: "bg-violet-500/15 text-violet-400",
        trend: "+3%",
        up: true,
      },
    ],
    [data]
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-white">
          <span className="text-indigo-400" aria-hidden>
            ●
          </span>
          Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Live snapshot of orders and revenue for your restaurant
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <ScaleOnHover key={stat.title}>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition-all duration-200 hover:border-zinc-600 hover:shadow-[0_0_0_1px_rgb(63_63_70),0_4px_24px_rgba(99,102,241,0.08)]">
              <div
                className={`mb-4 flex size-9 items-center justify-center rounded-lg text-xs font-bold ${stat.iconBg}`}
              >
                ◆
              </div>
              <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                {stat.title}
              </p>
              <p className="mt-2 text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-white">
                {loading ? (
                  "—"
                ) : stat.format === "currency" ? (
                  <NumberFlow
                    value={stat.value}
                    format={{ style: "currency", currency: "USD" }}
                  />
                ) : (
                  <NumberFlow value={stat.value} />
                )}
              </p>
              <p className="mt-3 flex items-center gap-1 text-xs text-zinc-500">
                <span
                  className={
                    stat.up ? "font-semibold text-emerald-400" : "font-semibold text-red-400"
                  }
                >
                  {stat.up ? "↑" : "↓"} {stat.trend}
                </span>
                <span>· {stat.hint}</span>
              </p>
            </div>
          </ScaleOnHover>
        ))}
      </StaggerContainer>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 lg:col-span-2">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-base font-bold tracking-tight text-white">
              Most ordered items
            </h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">Top 5 this week</p>
          </div>
          <div className="p-5">
            {loading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : data.topItems.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No orders yet this week. Popular items will show up here.
              </p>
            ) : (
              <ol className="space-y-3">
                {data.topItems.map((item, index) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs font-semibold text-zinc-400">
                        {index + 1}
                      </span>
                      <span className="truncate font-medium text-zinc-100">
                        {item.name}
                      </span>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-zinc-400">
                      {item.quantity} sold
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 lg:col-span-3">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-base font-bold tracking-tight text-white">
              Recent orders
            </h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">Last 10 orders</p>
          </div>
          <div className="p-5">
            {loading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : data.recentOrders.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No orders yet. When customers order, they’ll appear here.
              </p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {data.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Table #{order.table_number}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {formatTime(order.created_at)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={STATUS_STYLES[order.status]}
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm font-semibold tabular-nums text-white">
                        {formatCurrency(Number(order.total_amount))}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 bg-zinc-800/80 hover:bg-zinc-800/80">
                        <TableHead className="text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                          Table
                        </TableHead>
                        <TableHead className="text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                          Status
                        </TableHead>
                        <TableHead className="text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                          Total
                        </TableHead>
                        <TableHead className="text-right text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                          Time
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentOrders.map((order) => (
                        <TableRow
                          key={order.id}
                          className="border-zinc-800 transition-colors duration-100 hover:bg-zinc-800"
                        >
                          <TableCell className="font-medium text-zinc-100">
                            #{order.table_number}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={STATUS_STYLES[order.status]}
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold tabular-nums text-white">
                            {formatCurrency(Number(order.total_amount))}
                          </TableCell>
                          <TableCell className="text-right text-zinc-500">
                            {formatTime(order.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
