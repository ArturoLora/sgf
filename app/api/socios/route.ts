import { NextRequest, NextResponse } from "next/server";
import { SociosService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

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
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const socio = await SociosService.createSocio({
      ...body,
      userId: session.user.id,
    });

    return NextResponse.json(socio, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
