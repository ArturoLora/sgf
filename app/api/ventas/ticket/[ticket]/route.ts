import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticket: string }> },
) {
  try {
    const { ticket } = await params;

    const ventas = await prisma.inventario.findMany({
      where: {
        ticket,
        tipo: "VENTA",
      },
      include: {
        producto: {
          select: {
            nombre: true,
          },
        },
        socio: {
          select: {
            numeroSocio: true,
            nombre: true,
          },
        },
        usuario: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { fecha: "asc" },
    });

    if (ventas.length === 0) {
      return NextResponse.json(
        { error: "Ticket no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeDecimal(ventas));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
