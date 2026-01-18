import { NextRequest, NextResponse } from "next/server";
import { InventarioService } from "@/services";

// GET /api/inventario/ticket/[ticket]
export async function GET(
  request: NextRequest,
  { params }: { params: { ticket: string } }
) {
  try {
    const ticket = params.ticket;
    const ventas = await InventarioService.getVentasByTicket(ticket);
    return NextResponse.json(ventas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
