import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const shiftId = parseInt(id);

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        inventoryMovements: {
          where: {
            type: "SALE",
            isCancelled: false,
          },
        },
      },
    });

    if (!shift) {
      return NextResponse.json(
        { error: "Corte no encontrado" },
        { status: 404 },
      );
    }

    // Calcular totales para el cierre
    const tickets = new Set(shift.inventoryMovements.map((i) => i.ticket)).size;

    let cashAmount = 0;
    let debitCardAmount = 0;
    let creditCardAmount = 0;
    let totalSales = 0;

    shift.inventoryMovements.forEach((sale) => {
      const total = Number(sale.total || 0);
      totalSales += total;

      switch (sale.paymentMethod) {
        case "CASH":
          cashAmount += total;
          break;
        case "DEBIT_CARD":
          debitCardAmount += total;
          break;
        case "CREDIT_CARD":
          creditCardAmount += total;
          break;
      }
    });

    const summary = {
      initialCash: Number(shift.initialCash),
      ticketCount: tickets,
      totalSales,
      cashAmount,
      debitCardAmount,
      creditCardAmount,
      totalWithdrawals: Number(shift.totalWithdrawals || 0),
    };

    return NextResponse.json(serializeDecimal(summary));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
