"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/format";
import type { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type MenuItemCardProps = {
  item: MenuItem;
  sortable: boolean;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onToggleAvailable: (item: MenuItem, isAvailable: boolean) => void;
  togglingId: string | null;
};

export function MenuItemCard({
  item,
  sortable,
  onEdit,
  onDelete,
  onToggleAvailable,
  togglingId,
}: MenuItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !sortable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition-all duration-200 hover:border-zinc-600 hover:shadow-[0_0_0_1px_rgb(63_63_70),0_4px_24px_rgba(99,102,241,0.08)]",
        !item.is_available && "opacity-40",
        isDragging && "z-10 border-zinc-600 shadow-lg"
      )}
    >
      <div className="relative h-[180px] bg-zinc-800">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-600">
            <ImageIcon className="size-10" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-900 to-transparent" />
        {sortable ? (
          <button
            type="button"
            className="absolute top-2 left-2 touch-none rounded-md bg-zinc-950/80 p-1.5 text-zinc-300 shadow-sm hover:text-white"
            aria-label={`Drag ${item.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        {!item.is_available ? (
          <Badge className="absolute top-2 right-2 border-0 bg-red-500/90 text-white">
            Out of Stock
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="absolute top-2 right-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          >
            Available
          </Badge>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-white">
            {item.name}
          </p>
          <p className="mt-1 text-base font-bold tabular-nums text-indigo-400">
            {formatCurrency(Number(item.price))}
          </p>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] text-zinc-500">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-800 pt-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={item.is_available}
              disabled={togglingId === item.id}
              onCheckedChange={(checked) => onToggleAvailable(item, checked)}
              aria-label={`Toggle ${item.name} availability`}
            />
            <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">
              {item.is_available ? "In stock" : "Out"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
              onClick={() => onEdit(item)}
              aria-label={`Edit ${item.name}`}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={() => onDelete(item)}
              aria-label={`Delete ${item.name}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
