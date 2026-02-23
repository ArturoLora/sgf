// ===== app/api/inventory/movements/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { InventoryService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

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
