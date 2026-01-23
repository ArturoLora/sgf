import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const productoId = parseInt(id);

    const movimientos = await prisma.inventario.findMany({
      where: { productoId },
      include: {
        usuario: {
          select: {
            name: true,
          },
        },
        socio: {
          select: {
            numeroSocio: true,
            nombre: true,
          },
        },
      },
      orderBy: { fecha: "desc" },
      take: 100, // Últimos 100 movimientos
    });

    return NextResponse.json(serializeDecimal(movimientos));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
