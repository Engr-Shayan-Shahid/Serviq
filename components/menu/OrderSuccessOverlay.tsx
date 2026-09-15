"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

type OrderSuccessOverlayProps = {
  open: boolean;
  onDone: () => void;
};

export function OrderSuccessOverlay({ open, onDone }: OrderSuccessOverlayProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(onDone, reduceMotion ? 400 : 2500);
    return () => window.clearTimeout(timeout);
  }, [open, onDone, reduceMotion]);

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div className="relative flex items-center justify-center">
          {!reduceMotion ? (
            <motion.span
              className="absolute size-28 rounded-full"
              style={{
                backgroundColor:
                  "color-mix(in oklab, var(--menu-primary, #0f172a) 12%, transparent)",
              }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.85, 1.15, 0.95], opacity: [0.35, 0.55, 0.25] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              aria-hidden
            />
          ) : null}
          <motion.svg
            width="88"
            height="88"
            viewBox="0 0 88 88"
            fill="none"
            className="relative z-10"
            aria-hidden
          >
            <motion.circle
              cx="44"
              cy="44"
              r="40"
              stroke="var(--menu-primary, #0f172a)"
              strokeWidth="4"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
            />
            <motion.path
              d="M26 45.5 L38.5 58 L62 32"
              stroke="var(--menu-primary, #0f172a)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: reduceMotion ? 0 : 0.5,
                delay: reduceMotion ? 0 : 0.2,
                ease: "easeOut",
              }}
            />
          </motion.svg>
        </div>
        <motion.p
          className="font-display text-[28px] font-semibold tracking-tight text-slate-900"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.35, duration: reduceMotion ? 0 : 0.25 }}
        >
          Order Placed!
        </motion.p>
      </div>
    </motion.div>
  );
}
