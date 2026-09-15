import type { TimeSlot } from "@/lib/types";

export const TIME_SLOT_OPTIONS: { value: TimeSlot; label: string }[] = [
  { value: "all_day", label: "All Day" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  all_day: "All Day",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export function createEmptyCategoryForm() {
  return {
    name: "",
    description: "",
    time_slot: "all_day" as TimeSlot,
    is_active: true,
    image_url: null as string | null,
    imageFile: null as File | null,
  };
}

export type CategoryFormValues = ReturnType<typeof createEmptyCategoryForm>;

export function createEmptyItemForm(defaultCategoryId = "") {
  return {
    name: "",
    description: "",
    price: "",
    category_id: defaultCategoryId,
    is_available: true,
    display_order: 0,
    image_url: null as string | null,
    imageFile: null as File | null,
  };
}

export type ItemFormValues = ReturnType<typeof createEmptyItemForm>;
