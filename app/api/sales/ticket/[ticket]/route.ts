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

    // Agrupar en estructura de ticket
    const firstSale = sales[0];

    const ticketData = {
      ticket,
      date: firstSale.date,
      cashier: firstSale.user.name,
      paymentMethod: firstSale.paymentMethod,
      member: firstSale.member,
      isCancelled: firstSale.isCancelled,
      cancellationReason: firstSale.cancellationReason,
      cancellationDate: firstSale.cancellationDate,
      notes: firstSale.notes,
      total: sales.reduce((sum, s) => sum + Number(s.total || 0), 0),
      items: sales.map((s) => ({
        id: s.id,
        product: s.product,
        quantity: s.quantity,
        total: s.total,
      })),
    };

    return NextResponse.json(serializeDecimal(ticketData));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
