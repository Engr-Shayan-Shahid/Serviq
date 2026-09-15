"use client";

import { RouteError } from "@/components/shared/RouteError";

export default function WaiterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Waiter panel error"
      description="We couldn’t load ready orders. Tap retry to try again."
    />
  );
}
