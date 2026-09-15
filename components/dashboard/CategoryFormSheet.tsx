"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TIME_SLOT_OPTIONS,
  createEmptyCategoryForm,
  type CategoryFormValues,
} from "@/lib/menu";
import type { MenuCategory, TimeSlot } from "@/lib/types";

type CategoryFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: MenuCategory | null;
  saving: boolean;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
};

export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  saving,
  onSubmit,
}: CategoryFormSheetProps) {
  const [form, setForm] = useState<CategoryFormValues>(createEmptyCategoryForm());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (category) {
      setForm({
        name: category.name,
        description: category.description || "",
        time_slot: category.time_slot,
        is_active: category.is_active,
        image_url: category.image_url,
        imageFile: null,
      });
      setPreviewUrl(category.image_url);
    } else {
      setForm(createEmptyCategoryForm());
      setPreviewUrl(null);
    }
  }, [open, category]);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-zinc-800 bg-zinc-900 p-0 text-zinc-100 sm:max-w-md"
      >
        <SheetHeader className="border-b border-zinc-800">
          <SheetTitle className="text-white">
            {category ? "Edit category" : "Add category"}
          </SheetTitle>
          <SheetDescription>
            {category
              ? "Update this menu category and its display settings."
              : "Create a category to group menu items."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col">
          <div className="space-y-5 px-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Breakfast Specials"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Optional short description"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Time slot</Label>
              <RadioGroup
                value={form.time_slot}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    time_slot: value as TimeSlot,
                  }))
                }
                className="grid grid-cols-2 gap-2"
              >
                {TIME_SLOT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 has-[[data-checked]]:border-indigo-500 has-[[data-checked]]:bg-zinc-800"
                  >
                    <RadioGroupItem value={option.value} />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-image">Image</Label>
              <Input
                id="category-image"
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
                    alt="Category preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-700 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-white">Active</p>
                <p className="text-xs text-zinc-400">
                  Inactive categories are hidden from customers
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: checked }))
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
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving
                ? "Saving…"
                : category
                  ? "Save changes"
                  : "Create category"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
