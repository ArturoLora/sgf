import { NextRequest, NextResponse } from "next/server";
import { CortesService } from "@/services";

// POST /api/cortes/cerrar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const corte = await CortesService.cerrarCorte(body);
    return NextResponse.json(corte);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
