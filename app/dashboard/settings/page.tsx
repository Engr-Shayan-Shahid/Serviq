"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ExternalLink, Save } from "lucide-react";
import { MenuHeaderPreview } from "@/components/dashboard/MenuHeaderPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { formatTime } from "@/lib/format";
import { getAppOrigin } from "@/lib/qr";
import { toastError } from "@/lib/errors";
import { uploadMenuImage } from "@/lib/storage";
import { ownerSupabase } from "@/lib/supabase";
import type { Restaurant } from "@/lib/types";
import { generateSlug } from "@/lib/utils";
import { cn } from "@/lib/utils";

const HEX_COLOR = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Restaurant name is required"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only"
    ),
  primary_color: z
    .string()
    .regex(HEX_COLOR, "Enter a valid hex color like #000000"),
  secondary_color: z
    .string()
    .regex(HEX_COLOR, "Enter a valid hex color like #ffffff"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  trialing: "border-blue-200 bg-blue-50 text-blue-800",
  cancelled: "border-slate-200 bg-slate-100 text-slate-700",
};

function normalizeHex(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return HEX_COLOR.test(withHash) ? withHash : fallback;
}

export default function SettingsPage() {
  const { restaurantId, loading: authLoading } = useAuth(ownerSupabase);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      slug: "",
      primary_color: "#000000",
      secondary_color: "#ffffff",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = form;

  const watched = watch();

  const loadRestaurant = useCallback(async () => {
    if (!restaurantId) {
      setRestaurant(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = ownerSupabase;
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      setRestaurant(null);
      setLoading(false);
      return;
    }

    const row = (data as Restaurant | null) ?? null;
    setRestaurant(row);

    if (row) {
      reset({
        name: row.name,
        slug: row.slug,
        primary_color: normalizeHex(row.primary_color || "#000000", "#000000"),
        secondary_color: normalizeHex(
          row.secondary_color || "#ffffff",
          "#ffffff"
        ),
      });
      setLogoUrl(row.logo_url);
      setLogoPreview(row.logo_url);
      setLogoFile(null);
    }

    setLoading(false);
  }, [restaurantId, reset]);

  useEffect(() => {
    if (authLoading) return;
    void loadRestaurant();
  }, [authLoading, loadRestaurant]);

  useEffect(() => {
    if (!logoFile) return;
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const previewOrigin = useMemo(() => {
    try {
      return new URL(getAppOrigin()).host;
    } catch {
      return "app.com";
    }
  }, []);

  const slugPreview = watched.slug?.trim() || "your-slug";

  async function onSubmit(values: SettingsFormValues) {
    if (!restaurantId) {
      toast.error("No restaurant found for this account.");
      return;
    }

    setSaving(true);
    const supabase = ownerSupabase;

    try {
      let nextLogoUrl = logoUrl;

      if (logoFile) {
        nextLogoUrl = await uploadMenuImage(
          restaurantId,
          logoFile,
          "logos"
        );
      }

      const { data, error } = await supabase
        .from("restaurants")
        .update({
          name: values.name.trim(),
          slug: values.slug.trim(),
          primary_color: values.primary_color,
          secondary_color: values.secondary_color,
          logo_url: nextLogoUrl,
        })
        .eq("id", restaurantId)
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("That slug is already taken. Try another.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      const updated = data as Restaurant;
      setRestaurant(updated);
      setLogoUrl(updated.logo_url);
      setLogoPreview(updated.logo_url);
      setLogoFile(null);
      reset({
        name: updated.name,
        slug: updated.slug,
        primary_color: normalizeHex(
          updated.primary_color || "#000000",
          "#000000"
        ),
        secondary_color: normalizeHex(
          updated.secondary_color || "#ffffff",
          "#ffffff"
        ),
      });
      toast.success("Restaurant profile saved");
    } catch (err) {
      toastError(err, "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleNameBlur() {
    const currentSlug = watched.slug?.trim();
    const name = watched.name?.trim();
    if (!name) return;
    if (!currentSlug || currentSlug === generateSlug(restaurant?.name || "")) {
      setValue("slug", generateSlug(name), { shouldDirty: true });
    }
  }

  const subscriptionStatus = (
    restaurant?.subscription_status || "trialing"
  ).toLowerCase();

  const nameField = register("name");
  const slugField = register("slug");
  const primaryField = register("primary_color");
  const secondaryField = register("secondary_color");

  if (authLoading || loading) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
        Loading settings…
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-zinc-500">
        Restaurant not found for this account.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your restaurant profile, branding, and subscription.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-slate-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">
              Restaurant profile
            </CardTitle>
            <CardDescription>
              These details power your public menu branding and URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((values) => void onSubmit(values))}
              className="space-y-5"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant name</Label>
                <Input
                  id="name"
                  {...nameField}
                  onBlur={(e) => {
                    nameField.onBlur(e);
                    handleNameBlur();
                  }}
                  placeholder="Joe's Pizza"
                  aria-invalid={!!errors.name}
                />
                {errors.name ? (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  {...slugField}
                  placeholder="joes-pizza"
                  aria-invalid={!!errors.slug}
                />
                <p className="text-xs text-slate-500">
                  Preview URL:{" "}
                  <span className="font-medium text-slate-700">
                    {previewOrigin}/{slugPreview}
                  </span>
                </p>
                {errors.slug ? (
                  <p className="text-xs text-red-600">{errors.slug.message}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Primary color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="h-8 w-12 cursor-pointer p-1"
                      value={normalizeHex(watched.primary_color, "#000000")}
                      onChange={(e) =>
                        setValue("primary_color", e.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      aria-label="Primary color picker"
                    />
                    <Input
                      id="primary_color"
                      {...primaryField}
                      placeholder="#000000"
                      aria-invalid={!!errors.primary_color}
                    />
                  </div>
                  {errors.primary_color ? (
                    <p className="text-xs text-red-600">
                      {errors.primary_color.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Secondary color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="h-8 w-12 cursor-pointer p-1"
                      value={normalizeHex(watched.secondary_color, "#ffffff")}
                      onChange={(e) =>
                        setValue("secondary_color", e.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      aria-label="Secondary color picker"
                    />
                    <Input
                      id="secondary_color"
                      {...secondaryField}
                      placeholder="#ffffff"
                      aria-invalid={!!errors.secondary_color}
                    />
                  </div>
                  {errors.secondary_color ? (
                    <p className="text-xs text-red-600">
                      {errors.secondary_color.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setLogoFile(file);
                  }}
                />
                {logoPreview ? (
                  <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="size-14 rounded-lg object-cover"
                    />
                    <p className="text-xs text-slate-500">
                      {logoFile
                        ? "New logo selected — save to upload."
                        : "Current logo on your customer menu."}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={saving || (!isDirty && !logoFile)}
                >
                  <Save className="size-4" />
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3 xl:sticky xl:top-8 xl:self-start">
          <p className="text-sm font-medium text-slate-800">
            Customer menu preview
          </p>
          <MenuHeaderPreview
            name={watched.name}
            logoUrl={logoPreview}
            primaryColor={normalizeHex(watched.primary_color, "#000000")}
            secondaryColor={normalizeHex(watched.secondary_color, "#ffffff")}
          />
        </div>
      </div>

      <Card className="border-slate-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">
            Subscription
          </CardTitle>
          <CardDescription>
            Billing is handled through Stripe. Portal management comes next.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Current plan
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Monthly Flat Fee
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </p>
              <div className="mt-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    STATUS_STYLES[subscriptionStatus] ||
                      STATUS_STYLES.trialing
                  )}
                >
                  {subscriptionStatus}
                </Badge>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Account created
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatTime(restaurant.created_at)}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() =>
              toast.message("Stripe customer portal coming soon", {
                description:
                  "This will open billing management once Stripe is connected.",
              })
            }
          >
            <ExternalLink className="size-4" />
            Manage Subscription
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
