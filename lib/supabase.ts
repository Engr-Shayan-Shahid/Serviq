import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StaffRole } from "@/lib/types";

export const PANEL_SESSION_COOKIE = {
  owner: "sb-owner-session",
  kitchen: "sb-kitchen-session",
  waiter: "sb-waiter-session",
} as const;

export type PanelSession = keyof typeof PANEL_SESSION_COOKIE;

/** Keep cookies small so 3 panel sessions don't trigger HTTP 431 */
const PANEL_COOKIE_METHODS = {
  encode: "tokens-only" as const,
};

export function getSessionCookieForRole(role: StaffRole): string {
  return PANEL_SESSION_COOKIE[role];
}

function createPanelBrowserClient(cookieName: string) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Required: default singleton would return the first client for all panels
      isSingleton: false,
      cookieOptions: { name: cookieName },
      cookies: PANEL_COOKIE_METHODS,
    }
  );
}

type PanelClient = ReturnType<typeof createPanelBrowserClient>;

const panelClients: Partial<Record<PanelSession, PanelClient>> = {};

function getOrCreatePanelClient(panel: PanelSession): PanelClient {
  if (!panelClients[panel]) {
    panelClients[panel] = createPanelBrowserClient(PANEL_SESSION_COOKIE[panel]);
  }
  return panelClients[panel]!;
}

/**
 * Lazy proxies — importing this module must NOT create all 3 clients at once
 * (that was writing/reading multiple huge cookie sets on every page).
 */
function createLazyPanelClient(panel: PanelSession): PanelClient {
  return new Proxy({} as PanelClient, {
    get(_target, prop, _receiver) {
      const client = getOrCreatePanelClient(panel);
      const value = Reflect.get(client, prop, client);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

/** Owner dashboard session — isolated cookie */
export const ownerSupabase = createLazyPanelClient("owner");

/** Kitchen panel session — isolated cookie */
export const kitchenSupabase = createLazyPanelClient("kitchen");

/** Waiter panel session — isolated cookie */
export const waiterSupabase = createLazyPanelClient("waiter");

export function getPanelSupabase(panel: PanelSession): SupabaseClient {
  return getOrCreatePanelClient(panel);
}

/**
 * Public / customer pages — no auth cookie persistence.
 * Avoids an extra default `sb-*-auth-token` cookie that contributes to 431s.
 */
export function createSupabaseBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export { PANEL_COOKIE_METHODS };
