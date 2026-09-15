import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  PANEL_COOKIE_METHODS,
  PANEL_SESSION_COOKIE,
  type PanelSession,
} from "@/lib/supabase";

export function createSupabaseServerClient(panel?: PanelSession) {
  const cookieStore = cookies();
  const cookieName = panel ? PANEL_SESSION_COOKIE[panel] : undefined;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(cookieName ? { cookieOptions: { name: cookieName } } : {}),
      cookies: {
        ...PANEL_COOKIE_METHODS,
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components; middleware handles refresh.
          }
        },
      },
    }
  );
}
