import { NextRequest, NextResponse } from "next/server";
import { InventarioService } from "@/services";

// POST /api/inventario/ajuste
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ajuste = await InventarioService.createAjuste(body);
    return NextResponse.json(ajuste, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
