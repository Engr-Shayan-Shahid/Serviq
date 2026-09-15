"use client";

import { waiterSupabase } from "@/lib/supabase";
import { PanelLoginForm } from "@/components/auth/PanelLoginForm";

export default function WaiterLoginPage() {
  return (
    <PanelLoginForm
      title="Waiter Login"
      subtitle="Sign in to serve ready orders"
      badge="Waiter panel"
      panel="waiter"
      supabase={waiterSupabase}
      expectedRole="waiter"
      successPath="/waiter"
      wrongRoleMessage="This account does not have waiter access"
    />
  );
}
