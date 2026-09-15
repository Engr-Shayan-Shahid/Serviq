export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return fromEnv || "http://localhost:3000";
}

/** Public customer menu URL encoded into each table QR. */
export function buildTableMenuUrl(
  restaurantSlug: string,
  tableNumber: string,
  origin = getAppOrigin()
): string {
  const url = new URL(`/${restaurantSlug}`, origin);
  url.searchParams.set("table", tableNumber);
  return url.toString();
}

export function downloadCanvasPng(
  canvas: HTMLCanvasElement | null,
  filename: string
): boolean {
  if (!canvas) return false;

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
  return true;
}
