"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { LogOut, UtensilsCrossed, Volume2 } from "lucide-react";
import { toast } from "sonner";
import {
  WaiterOrderCard,
  type WaiterOrder,
} from "@/components/waiter/WaiterOrderCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toastError } from "@/lib/errors";
import { playWaiterAlert } from "@/lib/kitchen-sound";
import { waiterSupabase } from "@/lib/supabase";
import type { OrderItem } from "@/lib/types";

async function fetchReadyOrder(orderId: string): Promise<WaiterOrder | null> {
  const supabase = waiterSupabase;
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("status", "ready")
    .maybeSingle();

  if (error || !order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return {
    ...(order as WaiterOrder),
    order_items: (items as OrderItem[]) || [],
  };
}

export default function WaiterPage() {
  const router = useRouter();
  const { restaurantId, role, loading: authLoading, signOut, staff } =
    useAuth(waiterSupabase);
  const [orders, setOrders] = useState<WaiterOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [servingId, setServingId] = useState<string | null>(null);
  const primedRef = useRef(false);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const loadReadyOrders = useCallback(async () => {
    if (!restaurantId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = waiterSupabase;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("status", "ready")
      .order("updated_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const base = (data || []) as WaiterOrder[];
    const withItems = await Promise.all(
      base.map(async (order) => {
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
    if (role && role !== "waiter") {
      void (async () => {
        await signOut();
        router.replace("/auth/waiter/login");
      })();
      return;
    }
    void loadReadyOrders();
  }, [authLoading, role, loadReadyOrders, router, signOut]);

  const notifyReady = useCallback((order: WaiterOrder, isNew: boolean) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      if (exists) {
        return prev.map((o) => (o.id === order.id ? order : o));
      }
      return [...prev, order].sort(
        (a, b) =>
          new Date(a.updated_at || a.created_at).getTime() -
          new Date(b.updated_at || b.created_at).getTime()
      );
    });

    knownIdsRef.current.add(order.id);

    if (!primedRef.current || !isNew) return;

    playWaiterAlert();
    toast.success(`Table ${order.table_number} is ready`, {
      description: "Pick up the order and mark it served when delivered.",
      duration: 5000,
    });
  }, []);

  useEffect(() => {
    if (!restaurantId || role !== "waiter") return;

    const supabase = waiterSupabase;
    const channel = supabase
      .channel(`waiter-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as WaiterOrder;

          if (row.status === "served") {
            knownIdsRef.current.delete(row.id);
            setOrders((prev) => prev.filter((o) => o.id !== row.id));
            return;
          }

          if (row.status !== "ready") {
            // Left the ready queue (e.g. reverted) — hide it
            if (knownIdsRef.current.has(row.id)) {
              knownIdsRef.current.delete(row.id);
              setOrders((prev) => prev.filter((o) => o.id !== row.id));
            }
            return;
          }

          void (async () => {
            const full = await fetchReadyOrder(row.id);
            if (!full) return;
            const isNew = !knownIdsRef.current.has(full.id);
            notifyReady(full, isNew);
          })();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, role, notifyReady]);

  async function handleServe(order: WaiterOrder) {
    if (!restaurantId) return;
    setServingId(order.id);

    try {
      const supabase = waiterSupabase;
      const { error } = await supabase
        .from("orders")
        .update({ status: "served" })
        .eq("id", order.id)
        .eq("restaurant_id", restaurantId)
        .eq("status", "ready");

      if (error) throw error;

      knownIdsRef.current.delete(order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      toast.success(`Table ${order.table_number} marked served`);
    } catch (err) {
      toastError(err, "Failed to mark order as served");
    } finally {
      setServingId(null);
    }
  }

  async function handleLogout() {
    try {
      await signOut();
      router.replace("/auth/waiter/login");
    } catch (err) {
      toastError(err, "Failed to log out");
    }
  }

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] font-sans text-sm text-gray-500">
        Loading waiter panel…
      </main>
    );
  }

  if (role !== "waiter") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] font-sans text-sm text-gray-600">
        Waiter access only
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] font-sans text-gray-900">
      <header className="sticky top-0 z-10 h-[60px] border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex h-full max-w-lg items-center justify-between gap-3 px-4">
          <h1 className="truncate text-lg font-bold tracking-tight text-gray-900">
            Ready to Serve
          </h1>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">
              {orders.length} ready
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-500"
              onClick={() => playWaiterAlert()}
              aria-label="Test sound"
            >
              <Volume2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-500"
              onClick={() => void handleLogout()}
              aria-label="Log out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-3 px-4 py-4 pb-10">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.5,
                ease: "easeInOut",
              }}
            >
              <UtensilsCrossed className="size-16 text-gray-300" />
            </motion.div>
            <p className="mt-5 text-xl font-bold text-gray-700">
              All caught up!
            </p>
            <p className="mt-1 text-sm text-gray-400">
              No orders ready right now
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 22,
                  opacity: { duration: 0.2 },
                }}
              >
                <WaiterOrderCard
                  order={order}
                  serving={servingId === order.id}
                  onServe={(o) => void handleServe(o)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
