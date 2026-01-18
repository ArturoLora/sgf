import { NextRequest, NextResponse } from "next/server";
import { SociosService } from "@/services";

// GET /api/socios
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const activo = searchParams.get("activo");
    const tipoMembresia = searchParams.get("tipoMembresia") || undefined;

    const params = {
      search,
      activo: activo ? activo === "true" : undefined,
      tipoMembresia: tipoMembresia as any,
    };

    const socios = await SociosService.getAllSocios(params);
    return NextResponse.json(socios);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/socios
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const socio = await SociosService.createSocio(body);
    return NextResponse.json(socio, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
