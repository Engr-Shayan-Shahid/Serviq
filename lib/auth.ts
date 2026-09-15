import type { StaffRole } from "@/lib/types";
import { PANEL_BY_ROLE } from "@/lib/types";

export function getPanelForRole(role: StaffRole): string {
  return PANEL_BY_ROLE[role];
}

export function isProtectedPanelPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/kitchen" ||
    pathname.startsWith("/kitchen/") ||
    pathname === "/waiter" ||
    pathname.startsWith("/waiter/")
  );
}

export function getRequiredRoleForPath(pathname: string): StaffRole | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "owner";
  }
  if (pathname === "/kitchen" || pathname.startsWith("/kitchen/")) {
    return "kitchen";
  }
  if (pathname === "/waiter" || pathname.startsWith("/waiter/")) {
    return "waiter";
  }
  return null;
}
