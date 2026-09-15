"use client";

import NextTopLoader from "nextjs-toploader";

/**
 * Global thin progress bar for App Router navigations.
 * nextjs-toploader hooks into Next.js navigation (App Router equivalent of
 * the old pages-router `Router.events` start/complete pattern).
 */
export function NavigationProgress() {
  return (
    <NextTopLoader
      color="#0f172a"
      initialPosition={0.12}
      crawlSpeed={180}
      height={2}
      crawl
      showSpinner={false}
      easing="ease"
      speed={200}
      shadow={false}
      zIndex={9999}
    />
  );
}
