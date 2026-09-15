import { Suspense } from "react";
import OrderStatusClient from "./OrderStatusClient";

export default function OrderStatusPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          Loading order status…
        </main>
      }
    >
      <OrderStatusClient />
    </Suspense>
  );
}
