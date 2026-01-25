import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";

// GET /api/inventory/cancelled
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let cancelledSales;

    if (startDate && endDate) {
      cancelledSales = await InventoryService.getCancelledSales(
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      cancelledSales = await InventoryService.getCancelledSales();
    }

    return NextResponse.json(cancelledSales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
