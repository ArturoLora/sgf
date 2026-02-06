// ===== app/api/inventory/kardex/[id]/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const productId = InventoryService.parseProductIdParam(id);
    const movements = await InventoryService.getMovementsByProduct(
      productId,
      100,
    );
    return NextResponse.json(movements);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener kardex";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
