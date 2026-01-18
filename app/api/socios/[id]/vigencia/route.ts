import { NextRequest, NextResponse } from "next/server";
import { SociosService } from "@/services";

// GET /api/socios/[id]/vigencia
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const socioId = Number(id);

    if (isNaN(socioId)) {
      return NextResponse.json(
        { error: "ID de socio inválido" },
        { status: 400 }
      );
    }

    const vigencia = await SociosService.verificarVigencia(socioId);
    return NextResponse.json(vigencia);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Error al verificar vigencia" },
      { status: 400 }
    );
  }
}
