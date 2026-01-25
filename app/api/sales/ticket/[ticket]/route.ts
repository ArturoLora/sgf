import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticket: string }> },
) {
  try {
    const { ticket } = await params;

    const sales = await prisma.inventoryMovement.findMany({
      where: {
        ticket,
        type: "SALE",
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
        member: {
          select: {
            memberNumber: true,
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    if (sales.length === 0) {
      return NextResponse.json(
        { error: "Ticket no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeDecimal(sales));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
