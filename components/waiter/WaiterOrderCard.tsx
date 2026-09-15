"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Order, OrderItem } from "@/lib/types";
import { formatTime } from "@/lib/format";

export type WaiterOrder = Order & {
  order_items: OrderItem[];
};

type WaiterOrderCardProps = {
  order: WaiterOrder;
  onServe: (order: WaiterOrder) => void;
  serving: boolean;
};

export function WaiterOrderCard({
  order,
  onServe,
  serving,
}: WaiterOrderCardProps) {
  const readyAt = order.updated_at || order.created_at;
  const reduceMotion = useReducedMotion();

  return (
    <article className="relative overflow-hidden rounded-[20px] border border-transparent bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-[20px] bg-emerald-500" />
      <div className="p-5 pl-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400">
              Table
            </p>
            <p className="mt-0.5 text-[32px] font-extrabold leading-none tracking-tight text-gray-900">
              {order.table_number}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Ready {formatTime(readyAt)}
          </p>
        </div>

        <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
          {(order.order_items || []).map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 text-[15px] text-gray-700"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gray-300" />
              <span>
                <span className="font-semibold text-gray-900">
                  {item.quantity}×
                </span>{" "}
                {item.name}
                {item.special_note ? (
                  <span className="mt-0.5 block text-xs italic text-gray-400">
                    {item.special_note}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        <motion.button
          type="button"
          disabled={serving}
          onClick={() => onServe(order)}
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
          className="mt-5 h-[52px] w-full rounded-2xl bg-emerald-500 text-base font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
        >
          {serving ? "Updating…" : "Mark as Served"}
        </motion.button>
      </div>
    </article>
  );
}
