"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImageIcon, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TIME_SLOT_LABELS } from "@/lib/menu";
import type { MenuCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

type CategoryCardProps = {
  category: MenuCategory;
  onEdit: (category: MenuCategory) => void;
  onDelete: (category: MenuCategory) => void;
  onToggleActive: (category: MenuCategory, isActive: boolean) => void;
  togglingId: string | null;
};

export function CategoryCard({
  category,
  onEdit,
  onDelete,
  onToggleActive,
  togglingId,
}: CategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition-colors duration-150 hover:bg-zinc-800",
        isDragging && "z-10 border-zinc-600 shadow-lg shadow-indigo-500/10"
      )}
    >
      <button
        type="button"
        className="touch-none rounded-md p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
        aria-label={`Drag ${category.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800">
        {category.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image_url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon className="size-5 text-zinc-600" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[15px] font-semibold tracking-tight text-white">
            {category.name}
          </p>
          <Badge
            variant="outline"
            className="border-zinc-700 bg-zinc-800/80 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400"
          >
            {TIME_SLOT_LABELS[category.time_slot]}
          </Badge>
          {!category.is_active ? (
            <Badge
              variant="outline"
              className="border-amber-500/20 bg-amber-500/10 text-amber-400"
            >
              Inactive
            </Badge>
          ) : null}
        </div>
        {category.description ? (
          <p className="mt-1 line-clamp-1 text-[13px] text-zinc-500">
            {category.description}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Switch
          checked={category.is_active}
          disabled={togglingId === category.id}
          onCheckedChange={(checked) => onToggleActive(category, checked)}
          aria-label={`Toggle ${category.name} active`}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-zinc-400 hover:bg-zinc-700 hover:text-white"
          onClick={() => onEdit(category)}
          aria-label={`Edit ${category.name}`}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={() => onDelete(category)}
          aria-label={`Delete ${category.name}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
