import { NextRequest, NextResponse } from "next/server";
import { InventarioService } from "@/services";

// POST /api/inventario/entrada
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entrada = await InventarioService.createEntrada(body);
    return NextResponse.json(entrada, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
