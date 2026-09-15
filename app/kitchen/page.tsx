"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { LogOut, Volume2 } from "lucide-react";
import { toast } from "sonner";
import {
  KitchenOrderCard,
  type KitchenOrder,
} from "@/components/kitchen/KitchenOrderCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toastError } from "@/lib/errors";
import { playKitchenAlert } from "@/lib/kitchen-sound";
import type { PrintOrderPayload } from "@/lib/print";
import { kitchenSupabase } from "@/lib/supabase";
import type { OrderItem, Restaurant } from "@/lib/types";

async function fetchOrderWithItems(
  orderId: string
): Promise<KitchenOrder | null> {
  const supabase = kitchenSupabase;
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return {
    ...(order as KitchenOrder),
    order_items: (items as OrderItem[]) || [],
  };
}

/**
 * Sends receipt bytes to /api/print.
 * The returned buffer should later be forwarded to a thermal printer via
 * WebUSB or a local print server — this client currently stores/logs readiness only.
 */
async function triggerThermalPrint(payload: PrintOrderPayload) {
  const res = await fetch("/api/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "Print formatting failed");
  }

  // Raw ESC/POS buffer from the API — hand off to WebUSB / local print agent here.
  const buffer = await res.arrayBuffer();
  return buffer;
}

export default function KitchenPage() {
  const router = useRouter();
  const { restaurantId, role, loading: authLoading, signOut, staff } =
    useAuth(kitchenSupabase);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const primedRef = useRef(false);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const loadBoard = useCallback(async () => {
    if (!restaurantId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = kitchenSupabase;

    const [restaurantRes, ordersRes] = await Promise.all([
      supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .in("status", ["pending", "preparing"])
        .order("created_at", { ascending: true }),
    ]);

    if (restaurantRes.error) toast.error(restaurantRes.error.message);
    setRestaurant((restaurantRes.data as Restaurant | null) ?? null);

    if (ordersRes.error) {
      toast.error(ordersRes.error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const baseOrders = (ordersRes.data || []) as KitchenOrder[];
    const withItems = await Promise.all(
      baseOrders.map(async (order) => {
        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true });
        return {
          ...order,
          order_items: (items as OrderItem[]) || [],
        };
      })
    );

    knownIdsRef.current = new Set(withItems.map((o) => o.id));
    primedRef.current = true;
    setOrders(withItems);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (authLoading) return;
    if (role && role !== "kitchen") {
      void (async () => {
        await signOut();
        router.replace("/auth/kitchen/login");
      })();
      return;
    }
    void loadBoard();
  }, [authLoading, role, loadBoard, router, signOut]);

  const handleNewOrder = useCallback(
    async (orderId: string) => {
      const full = await fetchOrderWithItems(orderId);
      if (!full) return;
      if (full.status !== "pending" && full.status !== "preparing") return;

      setOrders((prev) => {
        if (prev.some((o) => o.id === full.id)) {
          return prev.map((o) => (o.id === full.id ? full : o));
        }
        return [...prev, full].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      const isNew = !knownIdsRef.current.has(full.id);
      knownIdsRef.current.add(full.id);

      if (!primedRef.current || !isNew || full.status !== "pending") return;

      playKitchenAlert();

      try {
        await triggerThermalPrint({
          restaurantName: restaurant?.name || "Restaurant",
          tableNumber: full.table_number,
          orderId: full.id,
          createdAt: full.created_at,
          items: (full.order_items || []).map((item) => ({
            name: item.name,
            quantity: item.quantity,
            specialNote: item.special_note,
          })),
        });
        toast.message(`Printed ticket · Table ${full.table_number}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Print failed";
        toast.error(message);
      }
    },
    [restaurant?.name]
  );

  useEffect(() => {
    if (!restaurantId || role !== "kitchen") return;

    const supabase = kitchenSupabase;
    const channel = supabase
      .channel(`kitchen-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as KitchenOrder;
          void handleNewOrder(row.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as KitchenOrder;

          if (row.status === "ready" || row.status === "served") {
            knownIdsRef.current.delete(row.id);
            setOrders((prev) => prev.filter((o) => o.id !== row.id));
            return;
          }

          if (row.status === "pending" || row.status === "preparing") {
            void (async () => {
              const full = await fetchOrderWithItems(row.id);
              if (!full) return;
              knownIdsRef.current.add(full.id);
              setOrders((prev) => {
                const exists = prev.some((o) => o.id === full.id);
                if (!exists) {
                  return [...prev, full].sort(
                    (a, b) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime()
                  );
                }
                return prev.map((o) => (o.id === full.id ? full : o));
              });
            })();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, role, handleNewOrder]);

  async function handleAction(order: KitchenOrder) {
    const nextStatus = order.status === "pending" ? "preparing" : "ready";
    setUpdatingId(order.id);

    try {
      const supabase = kitchenSupabase;
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus })
        .eq("id", order.id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      if (nextStatus === "ready") {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        knownIdsRef.current.delete(order.id);
        toast.success(`Table ${order.table_number} marked ready`);
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id ? { ...o, status: "preparing" } : o
          )
        );
        toast.success(`Table ${order.table_number} now preparing`);
      }
    } catch (err) {
      toastError(err, "Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleLogout() {
    try {
      await signOut();
      router.replace("/auth/kitchen/login");
    } catch (err) {
      toastError(err, "Failed to log out");
    }
  }

  const pending = useMemo(
    () => orders.filter((o) => o.status === "pending"),
    [orders]
  );
  const preparing = useMemo(
    () => orders.filter((o) => o.status === "preparing"),
    [orders]
  );

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black font-sans text-zinc-500">
        Loading kitchen board…
      </main>
    );
  }

  if (role !== "kitchen") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black font-sans text-zinc-300">
        Kitchen access only
      </main>
    );
  }

  const activeCount = pending.length + preparing.length;

  return (
    <main className="min-h-screen bg-black font-sans text-zinc-100">
      <header className="flex h-12 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6">
        <p className="truncate text-base font-semibold tracking-tight text-white">
          {restaurant?.name || "Restaurant"}
        </p>
        <KitchenClock />
        <div className="flex items-center gap-2 sm:gap-3">
          <p className="hidden text-sm font-semibold text-amber-400 sm:block">
            <span className="tabular-nums">{activeCount}</span> Active Orders
          </p>
          <button
            type="button"
            onClick={() => playKitchenAlert()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <Volume2 className="size-3.5" />
            <span className="hidden sm:inline">Sound</span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
            onClick={() => void handleLogout()}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:divide-x lg:divide-zinc-800">
        <section className="min-h-[50vh] min-w-0 bg-zinc-950 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-amber-400">
              Incoming
            </h2>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-400">
              {pending.length}
            </span>
          </div>
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-16 text-center text-sm text-zinc-600">
              No pending orders
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {pending.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ y: -40, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ x: -60, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 24,
                      opacity: { duration: 0.2 },
                    }}
                  >
                    <KitchenOrderCard
                      order={order}
                      updating={updatingId === order.id}
                      onAction={(o) => void handleAction(o)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        <section className="min-h-[50vh] min-w-0 bg-zinc-950 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-400">
              In Progress
            </h2>
            <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-bold tabular-nums text-blue-400">
              {preparing.length}
            </span>
          </div>
          {preparing.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-16 text-center text-sm text-zinc-600">
              Nothing preparing yet
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {preparing.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ y: -40, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ x: -60, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 24,
                      opacity: { duration: 0.2 },
                    }}
                  >
                    <KitchenOrderCard
                      order={order}
                      updating={updatingId === order.id}
                      onAction={(o) => void handleAction(o)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function KitchenClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="hidden text-sm font-light tabular-nums text-white md:block">
      {now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </p>
  );
}
