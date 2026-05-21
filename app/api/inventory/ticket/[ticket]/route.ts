// ===== app/api/inventory/ticket/[ticket]/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticket: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { ticket } = await params;

    const sales = await InventoryService.getSalesByTicket(ticket);

    return NextResponse.json(sales);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
