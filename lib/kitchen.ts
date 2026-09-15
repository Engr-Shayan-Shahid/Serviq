export function shortOrderId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

export function formatElapsed(createdAt: string, now = Date.now()): string {
  const placed = new Date(createdAt).getTime();
  if (Number.isNaN(placed)) return "—";

  const mins = Math.max(0, Math.floor((now - placed) / 60000));
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  return `${mins} mins ago`;
}

export function isOrderLate(createdAt: string, now = Date.now()): boolean {
  const placed = new Date(createdAt).getTime();
  if (Number.isNaN(placed)) return false;
  return now - placed >= 15 * 60 * 1000;
}
