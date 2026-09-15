"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { OrderStatusTracker } from "@/components/menu/OrderStatusTracker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { formatCurrency, formatTime } from "@/lib/format";
import { saveActiveOrder } from "@/lib/active-order";
import type {
  Order,
  OrderItem,
  OrderStatus,
  Restaurant,
} from "@/lib/types";

const STATUS_COPY: Record<OrderStatus, string> = {
  pending: "Your order has been received",
  preparing: "The kitchen is preparing your order",
  ready: "Your order is ready! A waiter will bring it shortly",
  served: "Enjoy your meal! Thank you for dining with us",
};

export default function OrderStatusClient() {
  const router = useRouter();
  const params = useParams<{ restaurantSlug: string }>();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const restaurantSlug = params.restaurantSlug;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [live, setLive] = useState(false);
  const [backDialogOpen, setBackDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) {
      setMissing(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", restaurantSlug)
      .maybeSingle();

    if (restaurantError) {
      toast.error(restaurantError.message);
    }

    if (!restaurantData) {
      setMissing(true);
      setLoading(false);
      return;
    }

    const restaurantRow = restaurantData as Restaurant;
    setRestaurant(restaurantRow);

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("restaurant_id", restaurantRow.id)
      .maybeSingle();

    if (orderError) {
      toast.error(orderError.message);
      setLoading(false);
      return;
    }

    if (!orderData) {
      setMissing(true);
      setLoading(false);
      return;
    }

    const nextOrder = orderData as Order;
    setOrder(nextOrder);
    saveActiveOrder({
      restaurantSlug,
      orderId: nextOrder.id,
      tableNumber: nextOrder.table_number,
    });

    const { data: itemData, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (itemsError) toast.error(itemsError.message);
    setItems((itemData as OrderItem[]) || []);
    setMissing(false);
    setLoading(false);
  }, [orderId, restaurantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!orderId) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(payload.new as Order);
          setLive(true);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLive(true);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  const cssVars = useMemo(() => {
    const primary = restaurant?.primary_color || "#0f172a";
    const secondary = restaurant?.secondary_color || "#ffffff";
    return {
      ["--menu-primary" as string]: primary,
      ["--menu-secondary" as string]: secondary,
      ["--menu-fg" as string]: "#0f172a",
      ["--menu-muted" as string]: "#64748b",
      ["--menu-surface" as string]: "#FAFAF9",
    };
  }, [restaurant]);

  const menuHref = order
    ? `/${restaurantSlug}${order.table_number ? `?table=${encodeURIComponent(order.table_number)}` : ""}`
    : `/${restaurantSlug}`;

  function goToMenu() {
    if (order) {
      saveActiveOrder({
        restaurantSlug,
        orderId: order.id,
        tableNumber: order.table_number,
      });
    }
    setBackDialogOpen(false);
    router.push(menuHref);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9] font-sans text-sm text-slate-500">
        Loading order status…
      </main>
    );
  }

  if (missing || !order || !restaurant) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAFAF9] px-4 text-center font-sans">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          Order not found
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          We couldn’t find that order. You can return to the menu and try again.
        </p>
        <Link
          href={`/${restaurantSlug}`}
          className="text-sm font-medium text-slate-900 underline underline-offset-4"
        >
          Back to menu
        </Link>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen pb-12 font-sans"
      style={{
        ...cssVars,
        backgroundColor: "var(--menu-surface)",
        color: "var(--menu-fg)",
      }}
    >
      <header
        className="h-[72px] px-4 shadow-[0_1px_0_rgba(0,0,0,0.06)]"
        style={{
          backgroundColor: "var(--menu-primary)",
          color: "var(--menu-secondary)",
        }}
      >
        <div className="mx-auto flex h-full max-w-[480px] items-center gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{
              backgroundColor:
                "color-mix(in oklab, var(--menu-secondary) 18%, transparent)",
            }}
          >
            {restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="size-full object-cover"
              />
            ) : (
              <ImageIcon className="size-4 opacity-80" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[20px] font-semibold leading-tight tracking-tight text-white">
              {restaurant.name}
            </h1>
            <p className="text-[11px] leading-tight text-white/75">
              Table {order.table_number}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[480px] space-y-5 px-4 py-8">
        <section className="rounded-[20px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Order status
              </h2>
              <p className="mt-1 text-sm text-[var(--menu-muted)]">
                Placed {formatTime(order.created_at)}
              </p>
            </div>
            {live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            ) : null}
          </div>

          <div className="mt-7">
            <OrderStatusTracker status={order.status} />
          </div>

          <p
            className="mt-7 rounded-2xl px-4 py-3.5 text-sm font-medium leading-relaxed"
            style={{
              backgroundColor:
                "color-mix(in oklab, var(--menu-primary) 10%, white)",
              color: "var(--menu-fg)",
            }}
          >
            {STATUS_COPY[order.status]}
          </p>
        </section>

        <section className="rounded-[20px] bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Order summary
          </h2>
          <ul className="mt-4 space-y-3.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.quantity}× {item.name}
                  </p>
                  {item.special_note ? (
                    <p className="mt-0.5 text-xs text-[var(--menu-muted)]">
                      Note: {item.special_note}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 tabular-nums text-[var(--menu-muted)]">
                  {formatCurrency(Number(item.price) * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between border-t border-black/[0.04] pt-4 text-sm">
            <span className="text-[var(--menu-muted)]">Total</span>
            <span
              className="text-base font-semibold tabular-nums"
              style={{ color: "var(--menu-primary)" }}
            >
              {formatCurrency(Number(order.total_amount))}
            </span>
          </div>
        </section>

        <button
          type="button"
          onClick={() => setBackDialogOpen(true)}
          className="block w-full text-center text-sm font-medium underline underline-offset-4"
          style={{ color: "var(--menu-primary)" }}
        >
          Back to menu
        </button>
      </div>

      <Dialog open={backDialogOpen} onOpenChange={setBackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Go back to the menu?</DialogTitle>
            <DialogDescription>
              You can keep browsing the menu. A button on the menu will take you
              back to this order status anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackDialogOpen(false)}>
              Stay on status
            </Button>
            <Button
              onClick={goToMenu}
              style={{
                backgroundColor: "var(--menu-primary)",
                color: "var(--menu-secondary)",
              }}
            >
              Go to menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
