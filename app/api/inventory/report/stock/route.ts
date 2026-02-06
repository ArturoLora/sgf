// ===== app/api/inventory/report/stock/route.ts =====

import { NextResponse } from "next/server";
import { ReportsService } from "@/services";

// GET /api/inventory/report/stock
export async function GET() {
  try {
    const report = await ReportsService.getCurrentStockReport();
    return NextResponse.json(report);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener reporte";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
