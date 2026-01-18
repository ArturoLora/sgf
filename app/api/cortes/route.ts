import { NextRequest, NextResponse } from "next/server";
import { CortesService } from "@/services";

// GET /api/cortes - Lista todos los cortes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limite = searchParams.get("limite");

    const cortes = await CortesService.getAllCortes(
      limite ? parseInt(limite) : undefined
    );
    return NextResponse.json(cortes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/cortes - Abrir corte
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const corte = await CortesService.abrirCorte(body);
    return NextResponse.json(corte, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
