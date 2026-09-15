import type { MenuCategory, TimeSlot } from "@/lib/types";

export function getCurrentTimeSlot(date = new Date()): TimeSlot {
  const hour = date.getHours();

  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 23) return "dinner";
  return "all_day";
}

/** Sort categories so the current meal period appears first, then all-day, then the rest. */
export function sortCategoriesForTime(
  categories: MenuCategory[],
  now = new Date()
): MenuCategory[] {
  const current = getCurrentTimeSlot(now);
  const rank = (slot: TimeSlot) => {
    if (slot === current) return 0;
    if (slot === "all_day") return 1;
    return 2;
  };

  return [...categories].sort((a, b) => {
    const rankDiff = rank(a.time_slot) - rank(b.time_slot);
    if (rankDiff !== 0) return rankDiff;
    return a.display_order - b.display_order;
  });
}
