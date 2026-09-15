import Link from "next/link";
import { ArrowRight, ChefHat, ConciergeBell, Store } from "lucide-react";

const ROLES = [
  {
    href: "/auth/owner/login",
    title: "Restaurant Owner",
    description: "Dashboard, menu, staff & QR",
    icon: Store,
    card: "bg-zinc-950 text-white border-zinc-800 hover:shadow-[0_20px_40px_rgba(99,102,241,0.25)]",
    iconWrap: "bg-indigo-500/20 text-indigo-300",
    arrow: "text-indigo-300 group-hover:translate-x-1",
  },
  {
    href: "/auth/kitchen/login",
    title: "Kitchen Staff",
    description: "Live kitchen display board",
    icon: ChefHat,
    card: "bg-zinc-950 text-white border-zinc-800 hover:shadow-[0_20px_40px_rgba(245,158,11,0.25)]",
    iconWrap: "bg-amber-500/20 text-amber-300",
    arrow: "text-amber-300 group-hover:translate-x-1",
  },
  {
    href: "/auth/waiter/login",
    title: "Waiter",
    description: "Serve ready orders on the floor",
    icon: ConciergeBell,
    card: "bg-white text-gray-900 border-gray-200 hover:shadow-[0_20px_40px_rgba(16,185,129,0.2)]",
    iconWrap: "bg-emerald-500/15 text-emerald-600",
    arrow: "text-emerald-600 group-hover:translate-x-1",
  },
] as const;

export default function AuthLoginLandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9] px-4 py-16">
      <div className="w-full max-w-4xl space-y-10">
        <div className="space-y-3 text-center">
          <h1 className="font-display text-[32px] font-bold tracking-tight text-gray-900">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-500">
            Choose your panel. Each role has its own secure login.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.href}
                href={role.href}
                className={`group flex flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 ${role.card}`}
              >
                <span
                  className={`mb-5 flex size-12 items-center justify-center rounded-xl ${role.iconWrap}`}
                >
                  <Icon className="size-6" />
                </span>
                <span className="text-lg font-bold tracking-tight">
                  {role.title}
                </span>
                <span className="mt-1 text-sm opacity-70">{role.description}</span>
                <span
                  className={`mt-6 inline-flex items-center gap-1 text-sm font-semibold transition-transform ${role.arrow}`}
                >
                  Sign In <ArrowRight className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-500">
          New restaurant?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-gray-900 underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
