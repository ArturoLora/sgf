import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticket: string }> },
) {
  try {
    const { ticket } = await params;

    const sales = await InventoryService.getSalesByTicket(ticket);

    return NextResponse.json(sales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
