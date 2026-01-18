import { NextResponse } from "next/server";
import { ReportesService } from "@/services";

// GET /api/inventario/reporte/stock
export async function GET() {
  try {
    const reporte = await ReportesService.getReporteStockActual();
    return NextResponse.json(reporte);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
