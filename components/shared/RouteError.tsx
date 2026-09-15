"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  variant?: "light" | "dark";
};

export function RouteError({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again.",
  variant = "light",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const dark = variant === "dark";

  return (
    <main
      className={
        dark
          ? "flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100"
          : "flex min-h-[60vh] items-center justify-center bg-slate-50 px-4"
      }
    >
      <div
        className={
          dark
            ? "w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center"
            : "w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
        }
      >
        <div
          className={
            dark
              ? "mx-auto flex size-12 items-center justify-center rounded-full bg-red-500/15 text-red-400"
              : "mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600"
          }
        >
          <AlertTriangle className="size-6" />
        </div>
        <h1
          className={
            dark
              ? "mt-4 text-xl font-semibold text-white"
              : "mt-4 text-xl font-semibold text-slate-900"
          }
        >
          {title}
        </h1>
        <p
          className={
            dark
              ? "mt-2 text-sm text-zinc-400"
              : "mt-2 text-sm text-slate-500"
          }
        >
          {description}
        </p>
        {error.message ? (
          <p
            className={
              dark
                ? "mt-3 rounded-lg bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400"
                : "mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500"
            }
          >
            {error.message}
          </p>
        ) : null}
        <Button
          className="mt-5"
          onClick={reset}
          variant={dark ? "secondary" : "default"}
        >
          Try again
        </Button>
      </div>
    </main>
  );
}
