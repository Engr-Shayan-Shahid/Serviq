import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RestaurantNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        404
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">
        Restaurant not found
      </h1>
      <p className="max-w-sm text-sm text-slate-500">
        We couldn’t find a restaurant for this link. Check the QR code or URL
        and try again.
      </p>
      <Button className="mt-2" variant="outline" render={<Link href="/" />}>
        Go home
      </Button>
    </main>
  );
}
