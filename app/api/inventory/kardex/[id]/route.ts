// ===== app/api/inventory/kardex/[id]/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const productId = InventoryService.parseProductIdParam(id);
    const movements = await InventoryService.getKardex(productId, 100);
    return NextResponse.json(movements);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener kardex";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
