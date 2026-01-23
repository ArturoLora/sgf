// services/shifts.service.ts
import { prisma } from "@/lib/db";
import { PaymentMethod } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { serializeDecimal } from "./utils";

// ==================== TYPES ====================

export interface OpenShiftInput {
  cashierId: string;
  initialCash: number;
  notes?: string;
}

export interface CloseShiftInput {
  shiftId: number;
  totalWithdrawals?: number;
  withdrawalsConcept?: string;
  totalCash: number;
  notes?: string;
}

// ==================== HELPERS ====================

/**
 * Convierte un número o Decimal a tipo Decimal de Prisma
 */
function toDecimal(value: number | Decimal): Decimal {
  return new Decimal(value.toString());
}

/**
 * Suma múltiples valores Decimal
 */
function addDecimals(...values: (number | Decimal)[]): Decimal {
  return values.reduce((sum, val) => sum.plus(toDecimal(val)), new Decimal(0));
}

/**
 * Resta dos valores Decimal
 */
function subtractDecimals(a: number | Decimal, b: number | Decimal): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

// ==================== VALIDATIONS ====================

/**
 * Verifica que el cajero no tenga un corte abierto
 */
async function validateNoOpenShift(cashierId: string) {
  const openShift = await prisma.shift.findFirst({
    where: {
      cashierId,
      closingDate: null,
    },
  });

  if (openShift) {
    throw new Error("Ya tienes un corte abierto");
  }
}

/**
 * Verifica que no exista ningún corte abierto en el sistema
 */
async function validateNoSystemOpenShift() {
  const openShift = await prisma.shift.findFirst({
    where: {
      closingDate: null,
    },
  });

  if (openShift) {
    throw new Error("Ya existe un corte abierto en el sistema");
  }
}

// ==================== PUBLIC SERVICES ====================

/**
 * Abre un nuevo corte de caja
 * Genera folio automático secuencial (FN-1, FN-2, etc.)
 */
export async function openShift(data: OpenShiftInput) {
  await validateNoOpenShift(data.cashierId);
  await validateNoSystemOpenShift();

  // Generar folio secuencial
  const lastShift = await prisma.shift.findFirst({
    orderBy: { createdAt: "desc" },
  });

  let newFolio = "FN-1";
  if (lastShift) {
    const currentNumber = parseInt(lastShift.folio.split("-")[1]) || 0;
    newFolio = `FN-${currentNumber + 1}`;
  }

  const shift = await prisma.shift.create({
    data: {
      folio: newFolio,
      cashierId: data.cashierId,
      openingDate: new Date(),
      initialCash: data.initialCash,
      notes: data.notes,
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

  return serializeDecimal(shift);
}

/**
 * Cierra un corte de caja
 * Calcula totales por forma de pago, tickets, diferencias, etc.
 */
export async function closeShift(data: CloseShiftInput) {
  const shift = await prisma.shift.findUnique({
    where: { id: data.shiftId },
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
    throw new Error("Corte no encontrado");
  }

  if (shift.closingDate) {
    throw new Error("El corte ya está cerrado");
  }

  // Contar tickets únicos
  const tickets = new Set(shift.inventoryMovements.map((i) => i.ticket)).size;

  // Inicializar totales
  let membershipSales = new Decimal(0);
  let productSales0Tax = new Decimal(0);
  let productSales16Tax = new Decimal(0);
  let cashAmount = new Decimal(0);
  let debitCardAmount = new Decimal(0);
  let creditCardAmount = new Decimal(0);

  // Obtener productos de membresía
  const membershipProducts = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: "EFECTIVO", mode: "insensitive" } },
        { name: { contains: "VISITA", mode: "insensitive" } },
      ],
    },
  });
  const membershipIds = membershipProducts.map((p) => p.id);

  // Calcular totales por tipo de producto y forma de pago
  for (const sale of shift.inventoryMovements) {
    const total = toDecimal(sale.total || 0);

    if (membershipIds.includes(sale.productId)) {
      membershipSales = membershipSales.plus(total);
    } else {
      productSales0Tax = productSales0Tax.plus(total);
    }

    switch (sale.paymentMethod) {
      case "CASH":
        cashAmount = cashAmount.plus(total);
        break;
      case "DEBIT_CARD":
        debitCardAmount = debitCardAmount.plus(total);
        break;
      case "CREDIT_CARD":
        creditCardAmount = creditCardAmount.plus(total);
        break;
    }
  }

  // Calcular subtotal, IVA, total
  const subtotal = addDecimals(
    membershipSales,
    productSales0Tax,
    productSales16Tax,
  );
  const tax = productSales16Tax.times(0.16);
  const totalSales = addDecimals(subtotal, tax);
  const totalVoucher = addDecimals(debitCardAmount, creditCardAmount);
  const totalWithdrawals = toDecimal(data.totalWithdrawals || 0);
  const totalCash = toDecimal(data.totalCash);
  const expectedCash = addDecimals(shift.initialCash, cashAmount).minus(
    totalWithdrawals,
  );
  const difference = subtractDecimals(totalCash, expectedCash);

  const updatedShift = await prisma.shift.update({
    where: { id: data.shiftId },
    data: {
      closingDate: new Date(),
      ticketCount: tickets,
      membershipSales,
      productSales0Tax,
      productSales16Tax,
      subtotal,
      tax,
      totalSales,
      cashAmount,
      debitCardAmount,
      creditCardAmount,
      totalVoucher,
      totalWithdrawals,
      withdrawalsConcept: data.withdrawalsConcept,
      totalCash,
      difference,
      notes: data.notes || shift.notes,
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

  return serializeDecimal(updatedShift);
}

/**
 * Obtiene el corte activo (sin cerrar)
 * Recalcula totales en tiempo real
 */
export async function getActiveShift() {
  const shift = await prisma.shift.findFirst({
    where: { closingDate: null },
    include: {
      cashier: {
        select: { id: true, name: true, email: true },
      },
      inventoryMovements: {
        where: { type: "SALE", isCancelled: false },
        include: {
          product: { select: { name: true } },
          member: { select: { memberNumber: true, name: true } },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!shift) return null;

  // Recalcular totales en tiempo real
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

  return serializeDecimal({
    ...shift,
    ticketCount: tickets,
    cashAmount,
    debitCardAmount,
    creditCardAmount,
    totalSales,
  });
}

/**
 * Obtiene un corte por ID con todas sus relaciones
 */
export async function getShiftById(id: number) {
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      cashier: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      inventoryMovements: {
        where: {
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
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!shift) {
    throw new Error("Corte no encontrado");
  }

  return serializeDecimal(shift);
}

/**
 * Lista todos los cortes con opción de límite
 */
export async function getAllShifts(limit?: number) {
  const shifts = await prisma.shift.findMany({
    include: {
      cashier: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { openingDate: "desc" },
    take: limit,
  });

  return serializeDecimal(shifts);
}

/**
 * Obtiene cortes dentro de un rango de fechas
 */
export async function getShiftsBetweenDates(startDate: Date, endDate: Date) {
  const shifts = await prisma.shift.findMany({
    where: {
      openingDate: {
        gte: startDate,
        lte: endDate,
      },
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
    orderBy: { openingDate: "desc" },
  });

  return serializeDecimal(shifts);
}

/**
 * Obtiene cortes de un cajero específico
 */
export async function getShiftsByCashier(cashierId: string, limit?: number) {
  const shifts = await prisma.shift.findMany({
    where: { cashierId },
    include: {
      cashier: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { openingDate: "desc" },
    take: limit,
  });

  return serializeDecimal(shifts);
}

/**
 * Genera resumen de ventas por producto para un corte
 */
export async function getSalesSummaryByShift(shiftId: number) {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      shiftId,
      type: "SALE",
      isCancelled: false,
    },
    include: {
      product: {
        select: {
          name: true,
        },
      },
    },
  });

  const summaryByProduct = sales.reduce(
    (acc, sale) => {
      const name = sale.product.name;
      if (!acc[name]) {
        acc[name] = {
          product: name,
          quantity: 0,
          total: new Decimal(0),
        };
      }
      acc[name].quantity += Math.abs(sale.quantity);
      acc[name].total = acc[name].total.plus(toDecimal(sale.total || 0));
      return acc;
    },
    {} as Record<string, { product: string; quantity: number; total: Decimal }>,
  );

  return serializeDecimal(Object.values(summaryByProduct));
}

/**
 * Genera resumen por forma de pago para un corte
 */
export async function getPaymentMethodSummary(shiftId: number) {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      shiftId,
      type: "SALE",
      isCancelled: false,
    },
  });

  const summary = sales.reduce(
    (acc, sale) => {
      const total = toDecimal(sale.total || 0);
      const method = sale.paymentMethod || "CASH";
      acc[method] = acc[method].plus(total);
      return acc;
    },
    {
      CASH: new Decimal(0),
      DEBIT_CARD: new Decimal(0),
      CREDIT_CARD: new Decimal(0),
      TRANSFER: new Decimal(0),
    },
  );

  return serializeDecimal(summary);
}

/**
 * Genera estadísticas generales de cortes en un período
 */
export async function getShiftsStatistics(startDate?: Date, endDate?: Date) {
  const where: any = {};

  if (startDate && endDate) {
    where.openingDate = {
      gte: startDate,
      lte: endDate,
    };
  }

  const shifts = await prisma.shift.findMany({
    where,
  });

  const totalShifts = shifts.length;
  const totalSales = shifts.reduce(
    (sum, s) => sum.plus(toDecimal(s.totalSales)),
    new Decimal(0),
  );
  const averageSales =
    totalShifts > 0 ? totalSales.dividedBy(totalShifts) : new Decimal(0);
  const totalDifferences = shifts.reduce(
    (sum, s) => sum.plus(toDecimal(Math.abs(Number(s.difference)))),
    new Decimal(0),
  );

  return serializeDecimal({
    totalShifts,
    totalSales,
    averageSales,
    totalDifferences,
  });
}

/**
 * Cancela un corte (solo ADMIN)
 * Elimina el corte del sistema
 */
export async function cancelShift(shiftId: number, userRole: string) {
  if (userRole !== "ADMIN") {
    throw new Error("Solo un administrador puede cancelar un corte");
  }

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    throw new Error("Corte no encontrado");
  }

  if (!shift.closingDate) {
    throw new Error("No se puede cancelar un corte abierto");
  }

  await prisma.shift.delete({
    where: { id: shiftId },
  });

  return { success: true, message: "Corte cancelado exitosamente" };
}
