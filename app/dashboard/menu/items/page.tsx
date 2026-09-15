"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ItemFormSheet } from "@/components/dashboard/ItemFormSheet";
import { MenuItemCard } from "@/components/dashboard/MenuItemCard";
import { Button } from "@/components/ui/button";
import {
  ScaleOnHover,
  StaggerContainer,
} from "@/components/shared/animations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { toastError } from "@/lib/errors";
import type { ItemFormValues } from "@/lib/menu";
import { ownerSupabase } from "@/lib/supabase";
import { uploadMenuImage } from "@/lib/storage";
import type { MenuCategory, MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_TAB = "all";

export default function MenuItemsPage() {
  const { restaurantId, loading: authLoading } = useAuth(ownerSupabase);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = useCallback(async () => {
    if (!restaurantId) {
      setCategories([]);
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = ownerSupabase;

    const [categoriesRes, itemsRes] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (categoriesRes.error) {
      toast.error(categoriesRes.error.message);
    } else {
      setCategories((categoriesRes.data as MenuCategory[]) || []);
    }

    if (itemsRes.error) {
      toast.error(itemsRes.error.message);
      setItems([]);
    } else {
      setItems((itemsRes.data as MenuItem[]) || []);
    }

    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (authLoading) return;
    void loadData();
  }, [authLoading, loadData]);

  const filteredItems = useMemo(() => {
    if (activeTab === ALL_TAB) return items;
    return items.filter((item) => item.category_id === activeTab);
  }, [items, activeTab]);

  const sortableEnabled = activeTab !== ALL_TAB;

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditing(item);
    setSheetOpen(true);
  }

  async function handleSubmit(values: ItemFormValues) {
    if (!restaurantId) {
      toast.error("No restaurant found for this account.");
      return;
    }

    if (!values.category_id) {
      toast.error("Please select a category.");
      return;
    }

    const price = Number(values.price);
    if (Number.isNaN(price) || price < 0) {
      toast.error("Enter a valid price.");
      return;
    }

    setSaving(true);
    const supabase = ownerSupabase;

    try {
      let imageUrl = values.image_url;

      if (values.imageFile) {
        imageUrl = await uploadMenuImage(
          restaurantId,
          values.imageFile,
          "items"
        );
      }

      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        price,
        category_id: values.category_id,
        is_available: values.is_available,
        display_order: values.display_order,
        image_url: imageUrl,
      };

      if (editing) {
        const { error } = await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editing.id)
          .eq("restaurant_id", restaurantId);

        if (error) throw error;
        toast.success("Item updated");
      } else {
        const siblings = items.filter(
          (i) => i.category_id === values.category_id
        );
        const nextOrder =
          values.display_order ||
          (siblings.length > 0
            ? Math.max(...siblings.map((i) => i.display_order)) + 1
            : 0);

        const { error } = await supabase.from("menu_items").insert({
          ...payload,
          display_order: nextOrder,
          restaurant_id: restaurantId,
        });

        if (error) throw error;
        toast.success("Item created");
      }

      setSheetOpen(false);
      setEditing(null);
      await loadData();
    } catch (err) {
      toastError(err, "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAvailable(item: MenuItem, isAvailable: boolean) {
    if (!restaurantId) return;

    setTogglingId(item.id);
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_available: isAvailable } : i
      )
    );

    try {
      const supabase = ownerSupabase;
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: isAvailable })
        .eq("id", item.id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      toast.success(isAvailable ? "Item marked available" : "Item out of stock");
    } catch (err) {
      toastError(err, "Failed to update availability");
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: item.is_available } : i
        )
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!restaurantId || !deleteTarget) return;

    setDeleting(true);
    try {
      const supabase = ownerSupabase;
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      toast.success("Item deleted");
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toastError(err, "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  }

  async function persistOrder(nextVisible: MenuItem[]) {
    if (!restaurantId) return;

    const supabase = ownerSupabase;
    const updates = nextVisible.map((item, index) =>
      supabase
        .from("menu_items")
        .update({ display_order: index })
        .eq("id", item.id)
        .eq("restaurant_id", restaurantId)
    );

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);

    if (failed?.error) {
      toast.error(failed.error.message);
      await loadData();
      return;
    }

    toast.success("Display order saved");
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (!sortableEnabled) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredItems.findIndex((i) => i.id === active.id);
    const newIndex = filteredItems.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previousItems = items;
    const reorderedVisible = arrayMove(filteredItems, oldIndex, newIndex).map(
      (item, index) => ({
        ...item,
        display_order: index,
      })
    );

    const orderMap = new Map(reorderedVisible.map((i) => [i.id, i.display_order]));
    const nextItems = items.map((item) =>
      orderMap.has(item.id)
        ? { ...item, display_order: orderMap.get(item.id)! }
        : item
    );

    setItems(nextItems);

    try {
      await persistOrder(reorderedVisible);
    } catch {
      setItems(previousItems);
    }
  }

  const defaultCategoryId =
    activeTab !== ALL_TAB ? activeTab : categories[0]?.id || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/dashboard/menu" className="hover:text-slate-800">
              Menu
            </Link>
            <span>/</span>
            <span className="text-slate-800">Items</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-white">
            Menu items
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Filter by category, drag to reorder within a category, and manage
            availability.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="shrink-0 gap-2"
          disabled={categories.length === 0}
        >
          <Plus className="size-4" />
          Add Item
        </Button>
      </div>

      {!authLoading && !loading && categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
          <p className="text-sm font-medium text-slate-800">
            Create a category first
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Items must belong to a category before you can add them.
          </p>
          <Button className="mt-4" render={<Link href="/dashboard/menu/categories" />}>
            Go to categories
          </Button>
        </div>
      ) : (
        <>
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="flex w-max gap-2 pb-1">
              <button
                type="button"
                onClick={() => setActiveTab(ALL_TAB)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  activeTab === ALL_TAB
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                )}
              >
                All ({items.length})
              </button>
              {categories.map((category) => {
                const count = items.filter(
                  (i) => i.category_id === category.id
                ).length;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveTab(category.id)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                      activeTab === category.id
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {category.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {sortableEnabled ? (
            <p className="text-xs text-slate-400">
              Drag cards by the handle to reorder this category.
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Select a category tab to enable drag-and-drop reordering.
            </p>
          )}

          {authLoading || loading ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
              Loading items…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
              <p className="text-sm font-medium text-slate-800">No items yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                Add your first menu item for this filter.
              </p>
              <Button
                onClick={openCreate}
                className="mt-4 gap-2"
                disabled={categories.length === 0}
              >
                <Plus className="size-4" />
                Add Item
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void handleDragEnd(event)}
            >
              <SortableContext
                items={filteredItems.map((i) => i.id)}
                strategy={rectSortingStrategy}
              >
                <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.map((item) => (
                    <ScaleOnHover key={item.id}>
                      <MenuItemCard
                        item={item}
                        sortable={sortableEnabled}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                        onToggleAvailable={(it, available) =>
                          void handleToggleAvailable(it, available)
                        }
                        togglingId={togglingId}
                      />
                    </ScaleOnHover>
                  ))}
                </StaggerContainer>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      <ItemFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        item={editing}
        categories={categories}
        defaultCategoryId={defaultCategoryId}
        saving={saving}
        onSubmit={handleSubmit}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-slate-800">
                {deleteTarget?.name}
              </span>
              . Existing order history keeps a name/price snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
