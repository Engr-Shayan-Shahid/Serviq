"use client";

import { RouteError } from "@/components/shared/RouteError";

export default function KitchenError({
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
      title="Kitchen board error"
      description="The kitchen display hit a snag. Retry to reload live orders."
      variant="dark"
    />
  );
}
