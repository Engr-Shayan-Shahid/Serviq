"use client";

import { ownerSupabase } from "@/lib/supabase";
import { PanelLoginForm } from "@/components/auth/PanelLoginForm";

export default function OwnerLoginPage() {
  return (
    <PanelLoginForm
      title="Restaurant Owner Login"
      subtitle="Sign in to manage your restaurant dashboard"
      badge="Owner panel"
      panel="owner"
      supabase={ownerSupabase}
      expectedRole="owner"
      successPath="/dashboard"
      wrongRoleMessage="This account does not have owner access"
    />
  );
}
