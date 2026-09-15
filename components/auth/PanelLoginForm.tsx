"use client";

import { FormEvent, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChefHat, ConciergeBell, Store } from "lucide-react";
import type { StaffRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PanelLoginFormProps = {
  title: string;
  subtitle: string;
  badge: string;
  panel: StaffRole;
  supabase: SupabaseClient;
  expectedRole: StaffRole;
  successPath: string;
  wrongRoleMessage: string;
};

function LoginFields({
  email,
  password,
  setEmail,
  setPassword,
  error,
  loading,
  accentButton,
  inputClass,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  error: string | null;
  loading: boolean;
  accentButton: string;
  inputClass: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[13px] font-medium text-zinc-400">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@restaurant.com"
          className={inputClass}
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="text-[13px] font-medium text-zinc-400"
        >
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={inputClass}
        />
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className={cn(
          "h-12 w-full rounded-xl text-base font-semibold",
          accentButton
        )}
        disabled={loading}
        size="lg"
      >
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </div>
  );
}

export function PanelLoginForm({
  title,
  subtitle,
  badge,
  panel,
  supabase,
  expectedRole,
  successPath,
  wrongRoleMessage,
}: PanelLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (authError) {
      setLoading(false);
      if (
        authError.message.toLowerCase().includes("invalid login credentials")
      ) {
        setError("Wrong email or password. Please try again.");
      } else {
        setError(authError.message);
      }
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setLoading(false);
      setError("Login failed. Please try again.");
      return;
    }

    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (staffError) {
      setLoading(false);
      setError(staffError.message);
      return;
    }

    if (!staff || staff.role !== expectedRole) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(wrongRoleMessage);
      return;
    }

    setLoading(false);
    router.replace(successPath);
    router.refresh();
  }

  const formProps = {
    email,
    password,
    setEmail,
    setPassword,
    error,
    loading,
  };

  let body: ReactNode;

  if (panel === "owner") {
    body = (
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-zinc-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.35),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(79,70,229,0.2),_transparent_50%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-indigo-200">
            <Store className="size-5" />
            Owner Portal
          </div>
          <div className="relative z-10 max-w-md">
            <p className="font-display text-4xl font-bold leading-tight tracking-tight text-white">
              Run your restaurant smarter
            </p>
            <p className="mt-4 text-base text-zinc-400">
              Menu, staff, QR codes, and live orders — one premium dashboard.
            </p>
          </div>
          <p className="relative z-10 text-xs uppercase tracking-[0.08em] text-zinc-600">
            Dark Premium SaaS
          </p>
        </div>
        <div className="flex items-center justify-center bg-white px-4 py-12">
          <div
            className={cn(
              "w-full max-w-md space-y-6",
              error && "animate-shake"
            )}
          >
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                {badge}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                {title}
              </h1>
              <p className="text-sm text-zinc-500">{subtitle}</p>
            </div>
            <form onSubmit={handleSubmit}>
              <LoginFields
                {...formProps}
                accentButton="bg-black text-white hover:bg-zinc-800"
                inputClass="h-11 rounded-xl border-gray-200 bg-gray-100 text-gray-900 focus-visible:ring-2 focus-visible:ring-black"
              />
            </form>
            <p className="text-center text-sm text-zinc-500">
              Wrong panel?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-gray-900 underline-offset-4 hover:underline"
              >
                Choose role
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  } else if (panel === "kitchen") {
    body = (
      <main className="flex min-h-screen items-center justify-center bg-[#111] px-4 py-12">
        <div
          className={cn(
            "w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-10 shadow-2xl",
            error && "animate-shake"
          )}
        >
          <div className="space-y-3 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10">
              <ChefHat className="size-8 text-amber-400" />
            </div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-white">
              {title}
            </h1>
            <p className="text-sm text-zinc-500">{subtitle}</p>
          </div>
          <form onSubmit={handleSubmit}>
            <LoginFields
              {...formProps}
              accentButton="bg-amber-500 text-black hover:bg-amber-400"
              inputClass="h-11 rounded-xl border-zinc-700 bg-zinc-800 text-white focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </form>
          <p className="text-center text-sm text-zinc-500">
            Wrong panel?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-zinc-200 underline-offset-4 hover:underline"
            >
              Choose role
            </Link>
          </p>
        </div>
      </main>
    );
  } else {
    body = (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
        <div
          className={cn(
            "w-full max-w-md space-y-6 rounded-3xl bg-white p-10 shadow-xl ring-1 ring-black/5",
            error && "animate-shake"
          )}
        >
          <div className="space-y-3 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500">
              <ConciergeBell className="size-7 text-white" />
            </div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-gray-900">
              {title}
            </h1>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <form onSubmit={handleSubmit}>
            <LoginFields
              {...formProps}
              accentButton="bg-emerald-500 text-white hover:bg-emerald-600"
              inputClass="h-11 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </form>
          <p className="text-center text-sm text-gray-500">
            Wrong panel?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-gray-900 underline-offset-4 hover:underline"
            >
              Choose role
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return body;
}
