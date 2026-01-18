import { NextRequest, NextResponse } from "next/server";
import { InventarioService } from "@/services";

// GET /api/inventario/movimientos?fechaInicio=...&fechaFin=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: "Se requieren fechaInicio y fechaFin" },
        { status: 400 }
      );
    }

    const movimientos = await InventarioService.getMovimientosByFecha(
      new Date(fechaInicio),
      new Date(fechaFin)
    );

    return NextResponse.json(movimientos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
