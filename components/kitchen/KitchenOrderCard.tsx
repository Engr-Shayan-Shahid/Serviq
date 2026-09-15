"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Order, OrderItem } from "@/lib/types";
import { formatElapsed, isOrderLate, shortOrderId } from "@/lib/kitchen";
import { cn } from "@/lib/utils";

export type KitchenOrder = Order & {
  order_items: OrderItem[];
};

type KitchenOrderCardProps = {
  order: KitchenOrder;
  onAction: (order: KitchenOrder) => void;
  updating: boolean;
};

export function KitchenOrderCard({
  order,
  onAction,
  updating,
}: KitchenOrderCardProps) {
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const late = isOrderLate(order.created_at, now);
  const isPending = order.status === "pending";

  return (
    <motion.article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900",
        late && "border-red-500/60"
      )}
      animate={
        isPending && !reduceMotion
          ? {
              boxShadow: [
                "0 0 0px #F59E0B",
                "0 0 12px #F59E0B",
                "0 0 0px #F59E0B",
              ],
            }
          : undefined
      }
      transition={
        isPending && !reduceMotion
          ? { repeat: Infinity, duration: 2 }
          : undefined
      }
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1 rounded-l-2xl",
          isPending ? "bg-amber-500" : "bg-blue-500"
        )}
      />

      <div className="flex flex-col p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-400">
              Order {shortOrderId(order.id)}
            </p>
            <p className="mt-1 text-xl font-extrabold tracking-tight text-white">
              #{shortOrderId(order.id)}
            </p>
          </div>
          <div className="text-right">
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-base font-bold uppercase tracking-wide text-white",
                isPending ? "bg-amber-500" : "bg-blue-500"
              )}
            >
              Table {order.table_number}
            </span>
            <motion.p
              className={cn(
                "mt-2 text-xs font-medium",
                late ? "font-bold text-red-400" : "text-zinc-500"
              )}
              animate={
                late && !reduceMotion
                  ? { scale: [1, 1.1, 1] }
                  : { scale: 1 }
              }
              transition={
                late && !reduceMotion
                  ? { repeat: Infinity, duration: 1 }
                  : { duration: 0 }
              }
            >
              {formatElapsed(order.created_at, now)}
            </motion.p>
          </div>
        </div>

        <div className="my-4 h-px bg-zinc-800" />

        <ul className="flex-1 space-y-2.5">
          {(order.order_items || []).map((item) => (
            <li key={item.id} className="text-[15px] text-zinc-100">
              <div className="flex items-center gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[11px] font-bold text-white">
                  {item.quantity}
                </span>
                <span className="font-medium">{item.name}</span>
              </div>
              {item.special_note ? (
                <p className="mt-0.5 pl-8 text-xs italic text-amber-400">
                  ↳ {item.special_note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        <motion.button
          type="button"
          disabled={updating}
          onClick={() => {
            setFlash(true);
            window.setTimeout(() => setFlash(false), 250);
            onAction(order);
          }}
          whileTap={reduceMotion ? undefined : { scale: 0.95 }}
          animate={
            flash && !reduceMotion
              ? { backgroundColor: "#22c55e" }
              : undefined
          }
          className={cn(
            "mt-5 h-12 w-full rounded-xl text-base font-bold transition hover:brightness-110 disabled:opacity-60",
            isPending
              ? "bg-amber-500 text-black"
              : "bg-blue-500 text-white"
          )}
        >
          {updating
            ? "Updating…"
            : isPending
              ? "Start Preparing"
              : "Order Ready"}
        </motion.button>
      </div>
    </motion.article>
  );
}
