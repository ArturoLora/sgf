// ===== app/api/inventory/transfer/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  CreateTransferInputSchema,
  type CrearTraspasoRequest,
} from "@/modules/inventory/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateTransferInputSchema.parse(body) as CrearTraspasoRequest;
    const transfer = await InventoryService.createTransfer(
      validated,
      session.user.id,
    );
    return NextResponse.json(transfer, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al crear traspaso";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
