import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      shiftId,
      cashAmount,
      debitCardAmount,
      creditCardAmount,
      totalWithdrawals,
      withdrawalsConcept,
      difference,
      notes,
    } = body;

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

    if (shift.closingDate) {
      return NextResponse.json(
        { error: "El corte ya está cerrado" },
        { status: 400 },
      );
    }

    // Calcular totales reales de ventas
    const tickets = new Set(shift.inventoryMovements.map((i) => i.ticket)).size;

    let realCash = 0;
    let realDebit = 0;
    let realCredit = 0;
    let membershipSales = 0;
    let productSales0Tax = 0;

    // Obtener IDs de productos de membresía
    const membershipProducts = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: "EFECTIVO", mode: "insensitive" } },
          { name: { contains: "VISITA", mode: "insensitive" } },
        ],
      },
    });
    const membershipIds = membershipProducts.map((p) => p.id);

    shift.inventoryMovements.forEach((sale) => {
      const total = Number(sale.total || 0);

      // Clasificar por tipo de producto
      if (membershipIds.includes(sale.productId)) {
        membershipSales += total;
      } else {
        productSales0Tax += total;
      }

      // Sumar por forma de pago
      switch (sale.paymentMethod) {
        case "CASH":
          realCash += total;
          break;
        case "DEBIT_CARD":
          realDebit += total;
          break;
        case "CREDIT_CARD":
          realCredit += total;
          break;
      }
    });

    const totalSales = membershipSales + productSales0Tax;
    const totalVoucher = debitCardAmount + creditCardAmount;
    const totalCash =
      cashAmount + debitCardAmount + creditCardAmount - (totalWithdrawals || 0);

    const updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        closingDate: new Date(),
        ticketCount: tickets,
        membershipSales,
        productSales0Tax,
        productSales16Tax: 0,
        subtotal: totalSales,
        tax: 0,
        totalSales,
        cashAmount: realCash,
        debitCardAmount: realDebit,
        creditCardAmount: realCredit,
        totalVoucher,
        totalWithdrawals: totalWithdrawals || 0,
        withdrawalsConcept,
        totalCash,
        difference,
        notes: notes || shift.notes,
      },
      include: {
        cashier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(serializeDecimal(updatedShift));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
