import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryRaw = {
      startDate: searchParams.get("startDate") ?? "",
      endDate: searchParams.get("endDate") ?? "",
    };

    const params = InventoryService.parseMovementsQuery(queryRaw);
    const movements = await InventoryService.getMovementsByDate(params);
    return NextResponse.json(movements);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener movimientos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
