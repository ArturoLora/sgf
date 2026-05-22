// ===== app/api/inventory/sale/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  CreateSaleInputSchema,
  type CrearVentaRequest,
} from "@/modules/inventory/types";

// POST /api/inventory/sale
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateSaleInputSchema.parse(body) as CrearVentaRequest;

    const sale = await InventoryService.createSale(validated, session.user.id);

    return NextResponse.json(sale, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al crear venta";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
