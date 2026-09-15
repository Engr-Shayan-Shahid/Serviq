import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredRoleForPath } from "@/lib/auth";
import {
  PANEL_COOKIE_METHODS,
  PANEL_SESSION_COOKIE,
  type PanelSession,
} from "@/lib/supabase";
import type { StaffRole } from "@/lib/types";

const LOGIN_BY_ROLE: Record<StaffRole, string> = {
  owner: "/auth/owner/login",
  kitchen: "/auth/kitchen/login",
  waiter: "/auth/waiter/login",
};

/** Old default Supabase cookie names that inflate headers and cause HTTP 431 */
function clearLegacyAuthCookies(
  request: NextRequest,
  response: NextResponse
) {
  for (const cookie of request.cookies.getAll()) {
    const { name } = cookie;
    // Default SSR cookie: sb-<project-ref>-auth-token(.N)
    const isLegacyDefault =
      name.startsWith("sb-") && name.includes("-auth-token");

    if (isLegacyDefault) {
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
      });
    }
  }
}

function createPanelServerClient(
  request: NextRequest,
  panel: PanelSession,
  supabaseResponse: { current: NextResponse }
) {
  const cookieName = PANEL_SESSION_COOKIE[panel];

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: cookieName },
      cookies: {
        ...PANEL_COOKIE_METHODS,
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse.current = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.current.cookies.set(name, value, options)
          );
        },
      },
    }
  );
}

/**
 * Middleware enforces panel isolation with separate session cookies:
 * - /dashboard → sb-owner-session + staff.role = owner
 * - /kitchen   → sb-kitchen-session + staff.role = kitchen
 * - /waiter    → sb-waiter-session + staff.role = waiter
 *
 * Missing/wrong session always redirects to that panel's login — never a generic login.
 */
export async function middleware(request: NextRequest) {
  const supabaseResponse = {
    current: NextResponse.next({ request }),
  };

  // Always strip legacy bloated auth cookies to prevent HTTP 431
  clearLegacyAuthCookies(request, supabaseResponse.current);

  const { pathname } = request.nextUrl;
  const requiredRole = getRequiredRoleForPath(pathname);

  // Public routes (including /[restaurantSlug] and /auth/*) — no auth required
  if (!requiredRole) {
    return supabaseResponse.current;
  }

  const supabase = createPanelServerClient(
    request,
    requiredRole,
    supabaseResponse
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginPath = LOGIN_BY_ROLE[requiredRole];

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = loginPath;
    loginUrl.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    clearLegacyAuthCookies(request, redirect);
    return redirect;
  }

  const { data: staff, error } = await supabase
    .from("staff")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", requiredRole)
    .maybeSingle();

  if (error || !staff) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = loginPath;
    const redirect = NextResponse.redirect(loginUrl);
    clearLegacyAuthCookies(request, redirect);
    return redirect;
  }

  return supabaseResponse.current;
}

export const config = {
  matcher: [
    /*
     * Run on app routes except static assets.
     * Role checks only apply to /dashboard, /kitchen, /waiter (see above).
     * /[restaurantSlug] and /auth/* remain fully public.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
