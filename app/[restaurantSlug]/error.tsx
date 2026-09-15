"use client";

import { RouteError } from "@/components/shared/RouteError";

export default function CustomerMenuError({
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
      title="Menu unavailable"
      description="We couldn’t load this restaurant menu. Please retry."
    />
  );
}
