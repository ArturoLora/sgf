import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";

// GET /api/inventory/ticket/[ticket]
export async function GET(
  request: NextRequest,
  { params }: { params: { ticket: string } }
) {
  try {
    const ticket = params.ticket;
    const sales = await InventoryService.getSalesByTicket(ticket);
    return NextResponse.json(sales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
