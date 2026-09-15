"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Staff, StaffRole } from "@/lib/types";

type AuthState = {
  user: User | null;
  role: StaffRole | null;
  staff: Staff | null;
  restaurantId: string | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

/**
 * Auth hook bound to a specific panel Supabase client.
 * Pass ownerSupabase / kitchenSupabase / waiterSupabase so sessions stay isolated.
 */
export function useAuth(supabase: SupabaseClient): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = useCallback(
    async (userId: string) => {
      const { data, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (staffError) {
        setError(staffError.message);
        setStaff(null);
        return;
      }

      setError(null);
      setStaff((data as Staff | null) ?? null);
    },
    [supabase]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser);

    if (currentUser) {
      await loadStaff(currentUser.id);
    } else {
      setStaff(null);
    }

    setLoading(false);
  }, [loadStaff, supabase]);

  useEffect(() => {
    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        await loadStaff(nextUser.id);
      } else {
        setStaff(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadStaff, refresh, supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStaff(null);
  }, [supabase]);

  return {
    user,
    role: staff?.role ?? null,
    staff,
    restaurantId: staff?.restaurant_id ?? null,
    loading,
    error,
    signOut,
    refresh,
  };
}
