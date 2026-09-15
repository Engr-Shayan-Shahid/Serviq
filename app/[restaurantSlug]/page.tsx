import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CustomerMenu } from "@/components/menu/CustomerMenu";

type PageProps = {
  params: { restaurantSlug: string };
  searchParams: { table?: string };
};

function createPublicSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export default async function CustomerMenuPage({
  params,
  searchParams,
}: PageProps) {
  const supabase = createPublicSupabaseClient();
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", params.restaurantSlug)
    .maybeSingle();

  if (error || !restaurant) {
    notFound();
  }

  return (
    <CustomerMenu
      restaurantSlug={params.restaurantSlug}
      initialTable={searchParams.table || ""}
    />
  );
}
