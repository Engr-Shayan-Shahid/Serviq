"use client";

import { useCallback, useEffect, useState } from "react";
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { CategoryCard } from "@/components/dashboard/CategoryCard";
import { CategoryFormSheet } from "@/components/dashboard/CategoryFormSheet";
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
import type { CategoryFormValues } from "@/lib/menu";
import { ownerSupabase } from "@/lib/supabase";
import { uploadMenuImage } from "@/lib/storage";
import type { MenuCategory } from "@/lib/types";

export default function MenuCategoriesPage() {
  const { restaurantId, loading: authLoading } = useAuth(ownerSupabase);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuCategory | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadCategories = useCallback(async () => {
    if (!restaurantId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = ownerSupabase;
    const { data, error } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setCategories([]);
    } else {
      setCategories((data as MenuCategory[]) || []);
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (authLoading) return;
    void loadCategories();
  }, [authLoading, loadCategories]);

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(category: MenuCategory) {
    setEditing(category);
    setSheetOpen(true);
  }

  async function handleSubmit(values: CategoryFormValues) {
    if (!restaurantId) {
      toast.error("No restaurant found for this account.");
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
          "categories"
        );
      }

      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        time_slot: values.time_slot,
        is_active: values.is_active,
        image_url: imageUrl,
      };

      if (editing) {
        const { error } = await supabase
          .from("menu_categories")
          .update(payload)
          .eq("id", editing.id)
          .eq("restaurant_id", restaurantId);

        if (error) throw error;
        toast.success("Category updated");
      } else {
        const nextOrder =
          categories.length > 0
            ? Math.max(...categories.map((c) => c.display_order)) + 1
            : 0;

        const { error } = await supabase.from("menu_categories").insert({
          ...payload,
          restaurant_id: restaurantId,
          display_order: nextOrder,
        });

        if (error) throw error;
        toast.success("Category created");
      }

      setSheetOpen(false);
      setEditing(null);
      await loadCategories();
    } catch (err) {
      toastError(err, "Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(category: MenuCategory, isActive: boolean) {
    if (!restaurantId) return;

    setTogglingId(category.id);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === category.id ? { ...c, is_active: isActive } : c
      )
    );

    try {
      const supabase = ownerSupabase;
      const { error } = await supabase
        .from("menu_categories")
        .update({ is_active: isActive })
        .eq("id", category.id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      toast.success(isActive ? "Category activated" : "Category deactivated");
    } catch (err) {
      toastError(err, "Failed to update category");
      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id ? { ...c, is_active: category.is_active } : c
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
        .from("menu_categories")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      toast.success("Category deleted");
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toastError(err, "Failed to delete category");
    } finally {
      setDeleting(false);
    }
  }

  async function persistOrder(next: MenuCategory[]) {
    if (!restaurantId) return;

    const supabase = ownerSupabase;
    const updates = next.map((category, index) =>
      supabase
        .from("menu_categories")
        .update({ display_order: index })
        .eq("id", category.id)
        .eq("restaurant_id", restaurantId)
    );

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);

    if (failed?.error) {
      toast.error(failed.error.message);
      await loadCategories();
      return;
    }

    toast.success("Display order saved");
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = categories;
    const next = arrayMove(categories, oldIndex, newIndex).map(
      (category, index) => ({
        ...category,
        display_order: index,
      })
    );

    setCategories(next);
    try {
      await persistOrder(next);
    } catch {
      setCategories(previous);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/dashboard/menu" className="hover:text-zinc-300">
              Menu
            </Link>
            <span>/</span>
            <span className="text-zinc-300">Categories</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-white">
            <span className="text-indigo-400" aria-hidden>
              ●
            </span>
            Categories
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drag to reorder. Toggle visibility, edit details, or add a new
            category.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0 gap-2">
          <Plus className="size-4" />
          Add Category
        </Button>
      </div>

      {authLoading || loading ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
          Loading categories…
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
          <p className="text-sm font-medium text-slate-800">No categories yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Create your first category to start building the menu.
          </p>
          <Button onClick={openCreate} className="mt-4 gap-2">
            <Plus className="size-4" />
            Add Category
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => void handleDragEnd(event)}
        >
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              <StaggerContainer className="space-y-2">
                {categories.map((category) => (
                  <ScaleOnHover key={category.id}>
                    <CategoryCard
                      category={category}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      onToggleActive={(cat, active) =>
                        void handleToggleActive(cat, active)
                      }
                      togglingId={togglingId}
                    />
                  </ScaleOnHover>
                ))}
              </StaggerContainer>
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CategoryFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        category={editing}
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
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-slate-800">
                {deleteTarget?.name}
              </span>
              . Menu items in this category may be unassigned.
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
