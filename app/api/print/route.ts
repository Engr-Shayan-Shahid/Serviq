import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  buildEscPosReceipt,
  type PrintOrderPayload,
} from "@/lib/print";

/**
 * POST /api/print
 *
 * Builds an ESC/POS receipt buffer for a kitchen order.
 *
 * IMPORTANT (frontend / kitchen client):
 * This endpoint returns raw printer bytes only. It does NOT print by itself.
 * After receiving the buffer, send it to the thermal printer via:
 *   - WebUSB (navigator.usb + escpos-buffer WebUSB connection), or
 *   - a local print server / agent on the kitchen network,
 *   - or fall back to browser print (react-to-print) if no thermal printer.
 */
async function resolvePrintStaff() {
  for (const panel of ["kitchen", "owner"] as const) {
    const supabase = createSupabaseServerClient(panel);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) continue;

    const { data: staff } = await supabase
      .from("staff")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      staff &&
      ((panel === "kitchen" && staff.role === "kitchen") ||
        (panel === "owner" && staff.role === "owner"))
    ) {
      return { ok: true as const };
    }
  }

  return { ok: false as const };
}

export async function POST(request: Request) {
  const auth = await resolvePrintStaff();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PrintOrderPayload;
  try {
    body = (await request.json()) as PrintOrderPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !body?.restaurantName ||
    !body?.tableNumber ||
    !body?.orderId ||
    !body?.createdAt ||
    !Array.isArray(body.items)
  ) {
    return NextResponse.json(
      { error: "Missing required order fields" },
      { status: 400 }
    );
  }

  try {
    const buffer = await buildEscPosReceipt(body);

    // Raw ESC/POS bytes for the kitchen client to forward to the printer.
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(buffer.length),
        "X-Receipt-Order-Id": body.orderId,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to format receipt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
