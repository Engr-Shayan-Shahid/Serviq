import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kitchen Display",
  description: "Live kitchen order board",
};

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
