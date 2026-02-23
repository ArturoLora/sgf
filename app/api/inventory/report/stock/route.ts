// ===== app/api/inventory/report/stock/route.ts =====

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ReportsService } from "@/services";

// GET /api/inventory/report/stock
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const report = await ReportsService.getCurrentStockReport();
    return NextResponse.json(report);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener reporte";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
