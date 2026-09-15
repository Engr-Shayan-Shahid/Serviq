"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/shared/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CartLine } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/format";

type CartSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLine[];
  total: number;
  tableNumber: string;
  onTableNumberChange: (value: string) => void;
  onQuantityChange: (key: string, quantity: number) => void;
  onSpecialNoteChange: (key: string, note: string) => void;
  onRemove: (key: string) => void;
  onPlaceOrder: () => void;
  placing: boolean;
};

export function CartSheet({
  open,
  onOpenChange,
  lines,
  total,
  tableNumber,
  onTableNumberChange,
  onQuantityChange,
  onSpecialNoteChange,
  onRemove,
  onPlaceOrder,
  placing,
}: CartSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex w-full flex-col gap-0 rounded-t-[24px] border-0 p-0 sm:mx-auto sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 border-b border-black/[0.04] px-5 py-5 text-left">
          <SheetTitle className="font-display text-2xl font-semibold tracking-tight text-[var(--menu-fg)]">
            Your Order
          </SheetTitle>
          <SheetDescription className="text-sm text-[var(--menu-muted)]">
            Adjust quantities, add notes, and confirm your table.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
          {lines.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--menu-muted)]">
              Your cart is empty. Add something from the menu.
            </p>
          ) : (
            lines.map((line, index) => (
              <FadeUp key={line.key} delay={index * 0.05}>
                <div className="rounded-2xl bg-[#FAFAF9] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-sans text-sm font-semibold text-[var(--menu-fg)] sm:text-[15px]">
                        {line.name}
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--menu-muted)]">
                        {formatCurrency(line.price)} each
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-10 shrink-0 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => onRemove(line.key)}
                      aria-label={`Remove ${line.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-0.5 rounded-full bg-white p-1 shadow-[0_1px_4px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
                      <motion.div whileTap={{ scale: 0.85 }}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 rounded-full"
                          onClick={() =>
                            onQuantityChange(line.key, line.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                      </motion.div>
                      <span className="w-7 text-center text-sm font-semibold tabular-nums">
                        {line.quantity}
                      </span>
                      <motion.div whileTap={{ scale: 0.85 }}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 rounded-full"
                          onClick={() =>
                            onQuantityChange(line.key, line.quantity + 1)
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </motion.div>
                    </div>
                    <p
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: "var(--menu-primary)" }}
                    >
                      {formatCurrency(line.price * line.quantity)}
                    </p>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <Label
                      htmlFor={`note-${line.key}`}
                      className="text-xs text-[var(--menu-muted)]"
                    >
                      Special note
                    </Label>
                    <Input
                      id={`note-${line.key}`}
                      value={line.specialNote}
                      onChange={(e) =>
                        onSpecialNoteChange(line.key, e.target.value)
                      }
                      placeholder="No onions, extra sauce…"
                      className="h-11 rounded-xl border-black/[0.06] bg-white text-base shadow-none"
                    />
                  </div>
                </div>
              </FadeUp>
            ))
          )}
        </div>

        <SheetFooter className="sticky bottom-0 shrink-0 gap-0 border-t border-black/[0.04] bg-white p-5 sm:flex-col">
          <div className="mb-4 flex w-full items-center justify-between">
            <span className="text-sm text-[var(--menu-muted)]">Subtotal</span>
            <span className="font-display text-xl font-semibold tabular-nums text-[var(--menu-fg)]">
              {formatCurrency(total)}
            </span>
          </div>

          <div className="mb-4 w-full space-y-1.5">
            <Label htmlFor="table-number" className="text-xs text-[var(--menu-muted)]">
              Table number
            </Label>
            <Input
              id="table-number"
              value={tableNumber}
              onChange={(e) => onTableNumberChange(e.target.value)}
              placeholder="e.g. 12"
              required
              className="h-11 rounded-xl border-black/[0.06] bg-[#FAFAF9] text-base shadow-none"
            />
          </div>

          <Button
            type="button"
            className="h-[52px] w-full rounded-2xl text-base font-semibold shadow-none"
            disabled={placing || lines.length === 0}
            onClick={onPlaceOrder}
            style={{
              backgroundColor: "var(--menu-primary)",
              color: "var(--menu-secondary)",
            }}
          >
            {placing ? "Placing order…" : "Place Order"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
