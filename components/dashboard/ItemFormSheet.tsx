"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createEmptyItemForm, type ItemFormValues } from "@/lib/menu";
import type { MenuCategory, MenuItem } from "@/lib/types";

type ItemFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  categories: MenuCategory[];
  defaultCategoryId: string;
  saving: boolean;
  onSubmit: (values: ItemFormValues) => Promise<void>;
};

export function ItemFormSheet({
  open,
  onOpenChange,
  item,
  categories,
  defaultCategoryId,
  saving,
  onSubmit,
}: ItemFormSheetProps) {
  const [form, setForm] = useState<ItemFormValues>(
    createEmptyItemForm(defaultCategoryId)
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (item) {
      setForm({
        name: item.name,
        description: item.description || "",
        price: String(item.price),
        category_id: item.category_id || "",
        is_available: item.is_available,
        display_order: item.display_order,
        image_url: item.image_url,
        imageFile: null,
      });
      setPreviewUrl(item.image_url);
    } else {
      const fallbackCategory =
        defaultCategoryId || categories[0]?.id || "";
      setForm(createEmptyItemForm(fallbackCategory));
      setPreviewUrl(null);
    }
  }, [open, item, defaultCategoryId, categories]);

  useEffect(() => {
    if (!form.imageFile) return;
    const url = URL.createObjectURL(form.imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.imageFile]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(form);
  }

  const selectedCategoryName =
    categories.find((c) => c.id === form.category_id)?.name || "Select category";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-zinc-800 bg-zinc-900 p-0 text-zinc-100 sm:max-w-md"
      >
        <SheetHeader className="border-b border-zinc-800">
          <SheetTitle className="text-white">
            {item ? "Edit item" : "Add item"}
          </SheetTitle>
          <SheetDescription>
            {item
              ? "Update this menu item’s details and availability."
              : "Add a new dish to your restaurant menu."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-1 flex-col"
        >
          <div className="space-y-5 px-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item name</Label>
              <Input
                id="item-name"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Margherita Pizza"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Optional short description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-price">Price</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-zinc-500">
                  $
                </span>
                <Input
                  id="item-price"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="pl-7"
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              {categories.length === 0 ? (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                  Create a category first before adding items.
                </p>
              ) : (
                <Select
                  value={form.category_id || null}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      category_id: value ?? "",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category">
                      {selectedCategoryName}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-image">Image</Label>
              <Input
                id="item-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setForm((prev) => ({ ...prev, imageFile: file }));
                }}
              />
              {previewUrl ? (
                <div className="relative mt-2 h-36 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Item preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-display-order">Display order</Label>
              <Input
                id="item-display-order"
                type="number"
                min="0"
                step="1"
                value={form.display_order}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    display_order: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-700 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-white">Available</p>
                <p className="text-xs text-zinc-400">
                  Turn off to mark this item out of stock
                </p>
              </div>
              <Switch
                checked={form.is_available}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_available: checked }))
                }
              />
            </div>
          </div>

          <SheetFooter className="border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                !form.name.trim() ||
                !form.category_id ||
                form.price === ""
              }
            >
              {saving ? "Saving…" : item ? "Save changes" : "Create item"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
