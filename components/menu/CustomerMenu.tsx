"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, ImageIcon, Plus, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { CartSheet } from "@/components/menu/CartSheet";
import { OrderSuccessOverlay } from "@/components/menu/OrderSuccessOverlay";
import {
  PageTransition,
  ScaleOnHover,
  StaggerContainer,
} from "@/components/shared/animations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/hooks/useCart";
import {
  clearActiveOrder,
  getOrderStatusPath,
  readActiveOrder,
  saveActiveOrder,
  type ActiveOrderRef,
} from "@/lib/active-order";
import { toastError } from "@/lib/errors";
import { formatCurrency } from "@/lib/format";
import { sortCategoriesForTime } from "@/lib/menu-time";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { MenuCategory, MenuItem, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";

type CustomerMenuProps = {
  restaurantSlug: string;
  initialTable?: string;
};

export function CustomerMenu({
  restaurantSlug,
  initialTable = "",
}: CustomerMenuProps) {
  const router = useRouter();
  const cart = useCart();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState(initialTable);
  const [placing, setPlacing] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ActiveOrderRef | null>(null);
  const [statusPromptOpen, setStatusPromptOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(0);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string } | null>(null);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    const supabase = createSupabaseBrowserClient();

    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", restaurantSlug)
      .maybeSingle();

    if (restaurantError) {
      toast.error(restaurantError.message);
      setLoading(false);
      return;
    }

    if (!restaurantData) {
      setNotFound(true);
      setRestaurant(null);
      setLoading(false);
      return;
    }

    const restaurantRow = restaurantData as Restaurant;
    setRestaurant(restaurantRow);

    const [categoriesRes, itemsRes] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurantRow.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantRow.id)
        .eq("is_available", true)
        .order("display_order", { ascending: true }),
    ]);

    if (categoriesRes.error) toast.error(categoriesRes.error.message);
    if (itemsRes.error) toast.error(itemsRes.error.message);

    const sorted = sortCategoriesForTime(
      (categoriesRes.data as MenuCategory[]) || []
    );
    setCategories(sorted);
    setItems((itemsRes.data as MenuItem[]) || []);
    setActiveCategoryId(sorted[0]?.id || "all");
    setLoading(false);
  }, [restaurantSlug]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    setTableNumber(initialTable);
  }, [initialTable]);

  useEffect(() => {
    const saved = readActiveOrder(restaurantSlug);
    if (!saved) return;
    setActiveOrder(saved);
    setStatusPromptOpen(true);
  }, [restaurantSlug]);

  const visibleItems = useMemo(() => {
    if (activeCategoryId === "all") return items;
    return items.filter((item) => item.category_id === activeCategoryId);
  }, [items, activeCategoryId]);

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

  async function handlePlaceOrder() {
    if (!restaurant) return;

    const table = tableNumber.trim();
    if (!table) {
      toast.error("Please enter your table number.");
      return;
    }

    if (cart.lines.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setPlacing(true);
    const supabase = createSupabaseBrowserClient();

    try {
      const { data: tableRow } = await supabase
        .from("tables")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .eq("table_number", table)
        .maybeSingle();

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          table_id: tableRow?.id ?? null,
          table_number: table,
          status: "pending",
          total_amount: cart.total,
        })
        .select("id")
        .single();

      if (orderError || !order) {
        throw new Error(orderError?.message || "Failed to create order");
      }

      const orderItems = cart.lines.map((line) => ({
        order_id: order.id,
        menu_item_id: line.menuItemId,
        name: line.name,
        price: line.price,
        quantity: line.quantity,
        special_note: line.specialNote.trim() || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      cart.clear();
      setCartOpen(false);
      saveActiveOrder({
        restaurantSlug,
        orderId: order.id,
        tableNumber: table,
      });
      toast.success("Order placed!");
      setOrderSuccess({ orderId: order.id });
    } catch (err) {
      toastError(err, "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9] font-sans text-sm text-slate-500">
        Loading menu…
      </main>
    );
  }

  if (notFound || !restaurant) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#FAFAF9] px-4 text-center font-sans">
        <h1 className="font-display text-2xl font-semibold text-slate-900">
          Restaurant not found
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          We couldn’t find a menu for “{restaurantSlug}”. Check the QR code or
          URL and try again.
        </p>
      </main>
    );
  }

  return (
    <PageTransition>
    <main
      className={cn(
        "min-h-screen font-sans",
        activeOrder && cart.itemCount > 0
          ? "pb-44"
          : activeOrder || cart.itemCount > 0
            ? "pb-28"
            : "pb-8"
      )}
      style={{
        ...cssVars,
        backgroundColor: "var(--menu-surface)",
        color: "var(--menu-fg)",
      }}
    >
      <header
        className="sticky top-0 z-20 h-[72px] px-4 shadow-[0_1px_0_rgba(0,0,0,0.06)]"
        style={{
          backgroundColor: "var(--menu-primary)",
          color: "var(--menu-secondary)",
        }}
      >
        <div className="mx-auto flex h-full max-w-5xl items-center gap-3">
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
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[20px] font-semibold leading-tight tracking-tight text-white">
              {restaurant.name}
            </h1>
            <p className="text-[11px] leading-tight text-white/75">
              {tableNumber
                ? `Table ${tableNumber}`
                : "Scan a table QR or enter your table in cart"}
            </p>
          </div>
          <motion.button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full text-white"
            style={{
              backgroundColor:
                "color-mix(in oklab, var(--menu-secondary) 14%, transparent)",
            }}
            aria-label={`Open cart${cart.itemCount > 0 ? `, ${cart.itemCount} items` : ""}`}
            key={cartBounce}
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 0.3 }}
          >
            <ShoppingBag className="size-5" />
            {cart.itemCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                {cart.itemCount > 99 ? "99+" : cart.itemCount}
              </span>
            ) : null}
          </motion.button>
        </div>
      </header>

      <div className="sticky top-[72px] z-10 border-b border-black/[0.04] bg-[#FAFAF9]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FAFAF9]/80">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveCategoryId("all")}
              className={cn(
                "relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                activeCategoryId === "all"
                  ? "shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-black/[0.06]"
              )}
              style={
                activeCategoryId === "all"
                  ? { color: "var(--menu-secondary)" }
                  : undefined
              }
            >
              {activeCategoryId === "all" ? (
                <motion.span
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: "var(--menu-primary)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10">All</span>
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={cn(
                  "relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  activeCategoryId === category.id
                    ? "shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-black/[0.06]"
                )}
                style={
                  activeCategoryId === category.id
                    ? { color: "var(--menu-secondary)" }
                    : undefined
                }
              >
                {activeCategoryId === category.id ? (
                  <motion.span
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: "var(--menu-primary)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-10">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <p className="mx-auto max-w-5xl px-3 py-16 text-center text-sm text-[var(--menu-muted)] sm:px-4">
          No items available in this category right now.
        </p>
      ) : (
        <StaggerContainer className="mx-auto grid max-w-5xl grid-cols-2 gap-3.5 px-3 py-5 sm:px-4 md:grid-cols-3 md:gap-5">
          {visibleItems.map((item) => (
            <ScaleOnHover key={item.id}>
              <article className="group flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-stone-300">
                      <ImageIcon className="size-8" />
                    </div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent"
                    aria-hidden
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-1 font-sans text-sm font-semibold tracking-tight text-[var(--menu-fg)] md:text-[15px]">
                      {item.name}
                    </h2>
                    {item.description ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--menu-muted)]">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: "var(--menu-primary)" }}
                    >
                      {formatCurrency(Number(item.price))}
                    </p>
                    <motion.div whileTap={{ scale: 0.92 }}>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 shrink-0 gap-0.5 rounded-full px-3 text-xs font-semibold shadow-none"
                        style={{
                          backgroundColor: "var(--menu-primary)",
                          color: "var(--menu-secondary)",
                        }}
                        onClick={() => {
                          cart.addItem(item);
                          setCartBounce((n) => n + 1);
                          toast.success(`Added ${item.name}`);
                        }}
                      >
                        <Plus className="size-3.5" strokeWidth={2.5} />
                        Add
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </article>
            </ScaleOnHover>
          ))}
        </StaggerContainer>
      )}

      {activeOrder ? (
        <div
          className={cn(
            "fixed inset-x-0 z-30 px-4",
            cart.itemCount > 0 ? "bottom-24" : "bottom-4"
          )}
        >
          <div className="mx-auto flex max-w-5xl items-center gap-2 rounded-2xl border border-black/[0.04] bg-white/95 p-2 shadow-[0_8px_32px_rgba(15,23,42,0.1)] backdrop-blur">
            <Link
              href={getOrderStatusPath(activeOrder)}
              className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
              style={{ color: "var(--menu-primary)" }}
            >
              <ClipboardList className="size-4 shrink-0" />
              Back to order status
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss order status shortcut"
              onClick={() => {
                clearActiveOrder();
                setActiveOrder(null);
                setStatusPromptOpen(false);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {cart.itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 p-4">
          <div className="mx-auto max-w-5xl">
            <motion.button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left shadow-[0_12px_40px_rgba(15,23,42,0.22)]"
              style={{
                backgroundColor: "var(--menu-primary)",
                color: "var(--menu-secondary)",
              }}
              key={`bar-${cartBounce}`}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.3 }}
            >
              <span className="flex items-center gap-2.5 font-medium">
                <span className="flex size-8 items-center justify-center rounded-full bg-white/15">
                  <ShoppingBag className="size-4" />
                </span>
                View cart · {cart.itemCount}{" "}
                {cart.itemCount === 1 ? "item" : "items"}
              </span>
              <span className="text-base font-semibold tabular-nums">
                {formatCurrency(cart.total)}
              </span>
            </motion.button>
          </div>
        </div>
      ) : null}

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        lines={cart.lines}
        total={cart.total}
        tableNumber={tableNumber}
        onTableNumberChange={setTableNumber}
        onQuantityChange={cart.setQuantity}
        onSpecialNoteChange={cart.setSpecialNote}
        onRemove={cart.removeItem}
        onPlaceOrder={() => void handlePlaceOrder()}
        placing={placing}
      />

      <Dialog open={statusPromptOpen} onOpenChange={setStatusPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Track your order anytime</DialogTitle>
            <DialogDescription>
              You still have an active order. Use{" "}
              <span className="font-medium text-slate-800">
                Back to order status
              </span>{" "}
              on this menu to return to your live status page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusPromptOpen(false)}
            >
              Keep browsing
            </Button>
            {activeOrder ? (
              <Button
                onClick={() => {
                  setStatusPromptOpen(false);
                  router.push(getOrderStatusPath(activeOrder));
                }}
                style={{
                  backgroundColor: "var(--menu-primary)",
                  color: "var(--menu-secondary)",
                }}
              >
                Take me to status
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderSuccessOverlay
        open={!!orderSuccess}
        onDone={() => {
          if (!orderSuccess) return;
          const id = orderSuccess.orderId;
          setOrderSuccess(null);
          router.push(`/${restaurantSlug}/status?orderId=${id}`);
        }}
      />
    </main>
    </PageTransition>
  );
}
