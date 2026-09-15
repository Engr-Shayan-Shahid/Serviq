"use client";

import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MenuHeaderPreviewProps = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  className?: string;
};

export function MenuHeaderPreview({
  name,
  logoUrl,
  primaryColor,
  secondaryColor,
  className,
}: MenuHeaderPreviewProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 shadow-sm",
        className
      )}
    >
      <div
        className="px-4 py-5"
        style={{ backgroundColor: primaryColor, color: secondaryColor }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl"
            style={{ backgroundColor: `${secondaryColor}22` }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={name || "Restaurant logo"}
                className="size-full object-cover"
              />
            ) : (
              <ImageIcon className="size-5 opacity-70" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">
              {name || "Restaurant name"}
            </p>
            <p className="text-xs opacity-80">Customer menu preview</p>
          </div>
        </div>
      </div>
      <div className="bg-white px-4 py-3">
        <div className="flex gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: primaryColor,
              color: secondaryColor,
            }}
          >
            Specials
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            Drinks
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Colors and logo update live as you edit.
        </p>
      </div>
    </div>
  );
}
