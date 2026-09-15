import { randomBytes } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Staff } from "@/lib/types";

export async function requireOwnerContext() {
  const supabase = createSupabaseServerClient("owner");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staffError || !staff) {
    return { error: "Staff profile not found", status: 403 as const };
  }

  if (staff.role !== "owner") {
    return { error: "Only owners can manage staff", status: 403 as const };
  }

  return {
    user,
    staff: staff as Staff,
    admin: createSupabaseAdminClient(),
  };
}

export function generateTempPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
