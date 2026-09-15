import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Waiter Panel",
  description: "Ready orders to serve",
};

export default function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
