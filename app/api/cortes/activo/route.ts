import { NextRequest, NextResponse } from "next/server";
import { CortesService } from "@/services";

// GET /api/cortes/activo
export async function GET() {
  try {
    const corte = await CortesService.getCorteActivo();

    if (!corte) {
      return NextResponse.json(
        { message: "No hay corte activo" },
        { status: 404 }
      );
    }

    return NextResponse.json(corte);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
