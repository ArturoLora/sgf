import { NextRequest, NextResponse } from "next/server";
import { SociosService } from "@/services";

// GET /api/socios/[id]
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

    const socio = await SociosService.getSocioById(socioId);
    return NextResponse.json(socio);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Socio no encontrado" },
      { status: 404 }
    );
  }
}

// PATCH /api/socios/[id]
export async function PATCH(
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

    const body = await request.json();
    const socio = await SociosService.updateSocio(socioId, body);

    return NextResponse.json(socio);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Error al actualizar socio" },
      { status: 400 }
    );
  }
}

// DELETE /api/socios/[id]
export async function DELETE(
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

    const socio = await SociosService.toggleSocioStatus(socioId);
    return NextResponse.json(socio);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Error al cambiar estado del socio" },
      { status: 400 }
    );
  }
}
