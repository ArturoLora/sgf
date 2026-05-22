// ===== app/api/inventory/adjustment/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  CreateAdjustmentInputSchema,
  type CrearAjusteRequest,
} from "@/modules/inventory/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateAdjustmentInputSchema.parse(body) as CrearAjusteRequest;
    const adjustment = await InventoryService.createAdjustment(
      validated,
      session.user.id,
    );
    return NextResponse.json(adjustment, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al crear ajuste";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
