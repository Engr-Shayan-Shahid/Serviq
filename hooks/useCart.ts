"use client";

import { useCallback, useMemo, useState } from "react";
import type { MenuItem } from "@/lib/types";

export type CartLine = {
  key: string;
  menuItemId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  specialNote: string;
};

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addItem = useCallback((item: MenuItem) => {
    setLines((prev) => {
      const existing = prev.find(
        (line) => line.menuItemId === item.id && !line.specialNote
      );

      if (existing) {
        return prev.map((line) =>
          line.key === existing.key
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }

      const next: CartLine = {
        key: `${item.id}-${Date.now()}`,
        menuItemId: item.id,
        name: item.name,
        price: Number(item.price),
        imageUrl: item.image_url,
        quantity: 1,
        specialNote: "",
      };

      return [...prev, next];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) {
        return prev.filter((line) => line.key !== key);
      }
      return prev.map((line) =>
        line.key === key ? { ...line, quantity } : line
      );
    });
  }, []);

  const setSpecialNote = useCallback((key: string, specialNote: string) => {
    setLines((prev) =>
      prev.map((line) =>
        line.key === key ? { ...line, specialNote } : line
      )
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines]
  );

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [lines]
  );

  return {
    lines,
    itemCount,
    total,
    addItem,
    setQuantity,
    setSpecialNote,
    removeItem,
    clear,
  };
}
