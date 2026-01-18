import { NextRequest, NextResponse } from "next/server";
import { InventarioService } from "@/services";

// POST /api/inventario/cancelar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cancelacion = await InventarioService.cancelarVenta(body);
    return NextResponse.json(cancelacion);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
