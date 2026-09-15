import { NextResponse } from "next/server";
import { generateTempPassword, requireOwnerContext } from "@/lib/staff-api";

type InviteBody = {
  name?: string;
  email?: string;
  role?: string;
};

export async function POST(request: Request) {
  const ctx = await requireOwnerContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = (await request.json()) as InviteBody;
  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const role = body.role;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  if (role !== "kitchen" && role !== "waiter") {
    return NextResponse.json(
      { error: "Role must be kitchen or waiter" },
      { status: 400 }
    );
  }

  const restaurantId = ctx.staff.restaurant_id;
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } =
    await ctx.admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role,
        restaurant_id: restaurantId,
      },
    });

  if (createError || !created.user) {
    const message = createError?.message || "Failed to create auth user";
    const status = message.toLowerCase().includes("already") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const { data: staffRow, error: staffError } = await ctx.admin
    .from("staff")
    .insert({
      restaurant_id: restaurantId,
      user_id: created.user.id,
      role,
      name,
      email,
    })
    .select("*")
    .single();

  if (staffError) {
    // Roll back auth user if staff insert fails
    await ctx.admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: staffError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    staff: staffRow,
    tempPassword,
  });
}
