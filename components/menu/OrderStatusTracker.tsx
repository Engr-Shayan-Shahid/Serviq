"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { FadeUp } from "@/components/shared/animations";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const FLOW: OrderStatus[] = ["pending", "preparing", "ready", "served"];

const LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
};

type OrderStatusTrackerProps = {
  status: OrderStatus;
};

export function OrderStatusTracker({ status }: OrderStatusTrackerProps) {
  const activeIndex = Math.max(0, FLOW.indexOf(status));
  const reduceMotion = useReducedMotion();

  return (
    <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
      {FLOW.map((step, index) => {
        const completed = index < activeIndex;
        const current = index === activeIndex;
        const upcoming = index > activeIndex;

        return (
          <FadeUp key={step} delay={index * 0.08}>
            <li className="flex flex-col items-center gap-2.5 text-center">
              <div className="relative flex w-full items-center justify-center">
                {index > 0 ? (
                  <span
                    className={cn(
                      "absolute right-1/2 left-[-50%] top-1/2 h-[2px] -translate-y-1/2 rounded-full",
                      index <= activeIndex
                        ? "bg-[var(--menu-primary)]"
                        : "bg-black/[0.08]"
                    )}
                    aria-hidden
                  />
                ) : null}
                <motion.span
                  className={cn(
                    "relative z-10 flex size-10 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    upcoming && "bg-black/[0.04] text-[var(--menu-muted)]",
                    (completed || current) && "text-[var(--menu-secondary)]"
                  )}
                  style={
                    completed || current
                      ? {
                          backgroundColor: "var(--menu-primary)",
                          boxShadow: current
                            ? "0 0 0 5px color-mix(in oklab, var(--menu-primary) 22%, transparent)"
                            : undefined,
                        }
                      : undefined
                  }
                  animate={
                    current && !reduceMotion
                      ? { scale: [1, 1.04, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    current && !reduceMotion
                      ? { repeat: Infinity, duration: 2 }
                      : { duration: 0 }
                  }
                >
                  {completed ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : (
                    index + 1
                  )}
                </motion.span>
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium sm:text-xs",
                  upcoming
                    ? "text-[var(--menu-muted)]"
                    : current
                      ? "font-semibold text-[var(--menu-fg)]"
                      : "text-[var(--menu-fg)]"
                )}
              >
                {LABELS[step]}
              </span>
            </li>
          </FadeUp>
        );
      })}
    </ol>
  );
}
