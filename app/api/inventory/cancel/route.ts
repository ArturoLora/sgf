// ===== app/api/inventory/cancel/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// POST /api/inventory/cancel
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const cancelledSale = await InventoryService.cancelSale(body);

    return NextResponse.json(cancelledSale);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al cancelar venta";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
