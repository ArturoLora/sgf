import { NextRequest, NextResponse } from "next/server";
import { InventarioService } from "@/services";

// POST /api/inventario/venta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const venta = await InventarioService.createVenta(body);
    return NextResponse.json(venta, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
