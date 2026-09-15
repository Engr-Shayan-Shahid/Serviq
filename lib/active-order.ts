const STORAGE_KEY = "active_order_status";

export type ActiveOrderRef = {
  restaurantSlug: string;
  orderId: string;
  tableNumber?: string;
};

export function saveActiveOrder(ref: ActiveOrderRef) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ref));
  } catch {
    // ignore quota / private mode
  }
}

export function readActiveOrder(restaurantSlug: string): ActiveOrderRef | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveOrderRef;
    if (parsed.restaurantSlug !== restaurantSlug || !parsed.orderId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveOrder() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getOrderStatusPath(ref: ActiveOrderRef): string {
  return `/${ref.restaurantSlug}/status?orderId=${encodeURIComponent(ref.orderId)}`;
}
