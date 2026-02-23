// ===== app/api/sales/ticket/[ticket]/route.ts =====

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
    const ticketData = await InventoryService.getTicketDetail(ticket);
    return NextResponse.json(ticketData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener ticket";
    const status =
      error instanceof Error && error.message === "Ticket no encontrado"
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
