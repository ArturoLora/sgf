import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";

// GET /api/inventory/movements?startDate=...&endDate=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Se requieren startDate y endDate" },
        { status: 400 }
      );
    }

    const movements = await InventoryService.getMovementsByDate(
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json(movements);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
