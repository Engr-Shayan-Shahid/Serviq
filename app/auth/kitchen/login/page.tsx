"use client";

import { kitchenSupabase } from "@/lib/supabase";
import { PanelLoginForm } from "@/components/auth/PanelLoginForm";

export default function KitchenLoginPage() {
  return (
    <PanelLoginForm
      title="Kitchen Staff Login"
      subtitle="Sign in to the kitchen display board"
      badge="Kitchen panel"
      panel="kitchen"
      supabase={kitchenSupabase}
      expectedRole="kitchen"
      successPath="/kitchen"
      wrongRoleMessage="This account does not have kitchen access"
    />
  );
}
