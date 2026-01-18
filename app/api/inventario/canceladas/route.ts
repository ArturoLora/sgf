import { NextRequest, NextResponse } from "next/server";
import { InventarioService } from "@/services";

// GET /api/inventario/canceladas?fechaInicio=...&fechaFin=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    const ventas = await InventarioService.getVentasCanceladas(
      fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin ? new Date(fechaFin) : undefined
    );

    return NextResponse.json(ventas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
