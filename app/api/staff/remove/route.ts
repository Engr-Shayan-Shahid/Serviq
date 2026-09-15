import { NextResponse } from "next/server";
import { requireOwnerContext } from "@/lib/staff-api";

type RemoveBody = {
  staffId?: string;
};

export async function POST(request: Request) {
  const ctx = await requireOwnerContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = (await request.json()) as RemoveBody;
  const staffId = body.staffId?.trim();

  if (!staffId) {
    return NextResponse.json({ error: "staffId is required" }, { status: 400 });
  }

  const { data: target, error: targetError } = await ctx.admin
    .from("staff")
    .select("*")
    .eq("id", staffId)
    .eq("restaurant_id", ctx.staff.restaurant_id)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 400 });
  }

  if (!target) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  if (target.role === "owner" || target.user_id === ctx.user.id) {
    return NextResponse.json(
      { error: "You cannot remove the restaurant owner" },
      { status: 400 }
    );
  }

  const { error: deleteError } = await ctx.admin
    .from("staff")
    .delete()
    .eq("id", target.id)
    .eq("restaurant_id", ctx.staff.restaurant_id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  // Disable (ban) the auth user so they can no longer sign in
  const { error: banError } = await ctx.admin.auth.admin.updateUserById(
    target.user_id,
    { ban_duration: "876600h" }
  );

  if (banError) {
    return NextResponse.json(
      {
        error: `Staff removed, but failed to disable login: ${banError.message}`,
      },
      { status: 207 }
    );
  }

  return NextResponse.json({ success: true });
}
