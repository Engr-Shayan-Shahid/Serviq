import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  QrCode,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Menu", href: "/dashboard/menu", icon: UtensilsCrossed },
  { title: "Orders", href: "/dashboard/orders", icon: ClipboardList },
  { title: "Tables & QR", href: "/dashboard/qr", icon: QrCode },
  { title: "Staff", href: "/dashboard/staff", icon: Users },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function isDashboardNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
