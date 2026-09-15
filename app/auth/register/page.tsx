"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ownerSupabase } from "@/lib/supabase";
import { generateSlug } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedRestaurant = restaurantName.trim();
    const trimmedOwner = ownerName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const slug = generateSlug(trimmedRestaurant);

    if (!slug) {
      setLoading(false);
      setError("Please enter a valid restaurant name.");
      return;
    }

    if (password.length < 6) {
      setLoading(false);
      setError("Password must be at least 6 characters.");
      return;
    }

    const supabase = ownerSupabase;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedOwner,
          restaurant_name: trimmedRestaurant,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    const user = authData.user;
    if (!user) {
      setLoading(false);
      setError("Could not create your account. Please try again.");
      return;
    }

    // Email confirmation may be enabled — need an active session for RLS inserts
    if (!authData.session) {
      setLoading(false);
      setError(
        "Account created, but email confirmation is required before continuing. Confirm your email, then sign in. (Or disable email confirmation in Supabase Auth settings for instant onboarding.)"
      );
      return;
    }

    // Security-definer RPC creates restaurant + owner staff (avoids staff RLS issues)
    const { error: registerError } = await supabase.rpc("register_restaurant", {
      p_name: trimmedRestaurant,
      p_slug: slug,
      p_owner_name: trimmedOwner,
    });

    if (registerError) {
      setLoading(false);
      if (registerError.message.toLowerCase().includes("duplicate")) {
        setError(
          "That restaurant name is already taken. Try a different name."
        );
      } else if (
        registerError.message.includes("Could not find the function") ||
        registerError.code === "PGRST202"
      ) {
        setError(
          "Setup incomplete: run the latest SQL migration in Supabase (register_restaurant function)."
        );
      } else {
        setError(registerError.message);
      }
      return;
    }

    setLoading(false);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-background p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your restaurant
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up your owner account and start managing orders
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restaurantName">Restaurant name</Label>
            <Input
              id="restaurantName"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Joe's Pizza"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerName">Owner name</Label>
            <Input
              id="ownerName"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@restaurant.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading} size="lg">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
