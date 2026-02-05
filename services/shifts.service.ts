import { prisma } from "@/lib/db";
import { mapPaymentMethod } from "./enum-mappers";
import { parseISODate, parseIntParam } from "./utils";
import { ShiftsQuerySchema, CloseShiftSchema } from "@/types/api/shifts";
import type {
  CorteResponse,
  CorteConVentasResponse,
  EstadisticasCortesResponse,
  ResumenVentasPorProducto,
  ResumenPorFormaPago,
  ResumenCorteResponse,
  ListaCortesResponse,
  ShiftsQueryInput,
  CloseShiftInput,
  AbrirCorteRequest,
} from "@/types/api/shifts";

export interface GetShiftsParams {
  search?: string;
  startDate?: Date;
  endDate?: Date;
  cashier?: string;
  status?: string;
  orderBy?: string;
  order?: string;
  page?: number;
  perPage?: number;
}

function serializeShift(shift: {
  id: number;
  folio: string;
  cashierId: string;
  openingDate: Date;
  closingDate: Date | null;
  initialCash: import("@prisma/client/runtime/library").Decimal;
  ticketCount: number;
  membershipSales: import("@prisma/client/runtime/library").Decimal;
  productSales0Tax: import("@prisma/client/runtime/library").Decimal;
  productSales16Tax: import("@prisma/client/runtime/library").Decimal;
  subtotal: import("@prisma/client/runtime/library").Decimal;
  tax: import("@prisma/client/runtime/library").Decimal;
  totalSales: import("@prisma/client/runtime/library").Decimal;
  cashAmount: import("@prisma/client/runtime/library").Decimal;
  debitCardAmount: import("@prisma/client/runtime/library").Decimal;
  creditCardAmount: import("@prisma/client/runtime/library").Decimal;
  totalVoucher: import("@prisma/client/runtime/library").Decimal;
  totalWithdrawals: import("@prisma/client/runtime/library").Decimal;
  withdrawalsConcept: string | null;
  cancelledSales: import("@prisma/client/runtime/library").Decimal;
  totalCash: import("@prisma/client/runtime/library").Decimal;
  difference: import("@prisma/client/runtime/library").Decimal;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  cashier: { id: string; name: string; email: string };
}): CorteResponse {
  return {
    id: shift.id,
    folio: shift.folio,
    cashierId: shift.cashierId,
    openingDate: shift.openingDate,
    closingDate: shift.closingDate ?? undefined,
    initialCash: Number(shift.initialCash),
    ticketCount: shift.ticketCount,
    membershipSales: Number(shift.membershipSales),
    productSales0Tax: Number(shift.productSales0Tax),
    productSales16Tax: Number(shift.productSales16Tax),
    subtotal: Number(shift.subtotal),
    tax: Number(shift.tax),
    totalSales: Number(shift.totalSales),
    cashAmount: Number(shift.cashAmount),
    debitCardAmount: Number(shift.debitCardAmount),
    creditCardAmount: Number(shift.creditCardAmount),
    totalVoucher: Number(shift.totalVoucher),
    totalWithdrawals: Number(shift.totalWithdrawals),
    withdrawalsConcept: shift.withdrawalsConcept ?? undefined,
    cancelledSales: Number(shift.cancelledSales),
    totalCash: Number(shift.totalCash),
    difference: Number(shift.difference),
    notes: shift.notes ?? undefined,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
    cashier: shift.cashier,
  };
}

async function validateNoOpenShift(cashierId: string): Promise<void> {
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

async function validateNoSystemOpenShift(): Promise<void> {
  const openShift = await prisma.shift.findFirst({
    where: {
      closingDate: null,
    },
  });

  if (openShift) {
    throw new Error("Ya existe un corte abierto en el sistema");
  }
}

// ==================== PARSING HELPERS ====================

export function parseShiftsQuery(raw: ShiftsQueryInput): GetShiftsParams {
  const validated = ShiftsQuerySchema.parse(raw);

  return {
    search: validated.search,
    startDate: parseISODate(validated.startDate),
    endDate: parseISODate(validated.endDate),
    cashier: validated.cashier,
    status: validated.status,
    orderBy: validated.orderBy,
    order: validated.order,
    page: validated.page ? parseInt(validated.page, 10) : 1,
    perPage: validated.perPage ? parseInt(validated.perPage, 10) : 10,
  };
}

export function parseCloseShiftInput(raw: CloseShiftInput): CloseShiftInput {
  const validated = CloseShiftSchema.parse(raw);
  return validated;
}

export function parseShiftIdParam(id: string): number {
  return parseIntParam(id, "ID de corte");
}

// ==================== SHIFT SERVICES ====================

export async function openShift(
  data: AbrirCorteRequest,
  cashierId: string,
): Promise<CorteResponse> {
  await validateNoOpenShift(cashierId);
  await validateNoSystemOpenShift();

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
      cashierId,
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

  return serializeShift(shift);
}

export async function closeShift(
  data: CloseShiftInput,
): Promise<CorteResponse> {
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

  const tickets = new Set(shift.inventoryMovements.map((i) => i.ticket)).size;

  let membershipSales = 0;
  let productSales0Tax = 0;
  const productSales16Tax = 0;
  let cashAmount = 0;
  let debitCardAmount = 0;
  let creditCardAmount = 0;

  const membershipProducts = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: "EFECTIVO", mode: "insensitive" } },
        { name: { contains: "VISITA", mode: "insensitive" } },
      ],
    },
  });
  const membershipIds = membershipProducts.map((p) => p.id);

  for (const sale of shift.inventoryMovements) {
    const total = Number(sale.total || 0);

    if (membershipIds.includes(sale.productId)) {
      membershipSales += total;
    } else {
      productSales0Tax += total;
    }

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
  }

  const subtotal = membershipSales + productSales0Tax + productSales16Tax;
  const tax = productSales16Tax * 0.16;
  const totalSales = subtotal + tax;
  const totalVoucher = debitCardAmount + creditCardAmount;
  const totalWithdrawals = data.totalWithdrawals || 0;
  const totalCash =
    (data.cashAmount || 0) +
    (data.debitCardAmount || 0) +
    (data.creditCardAmount || 0) -
    totalWithdrawals;
  const expectedCash =
    Number(shift.initialCash) + cashAmount - totalWithdrawals;
  const difference =
    data.difference !== undefined ? data.difference : totalCash - expectedCash;

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

  return serializeShift(updatedShift);
}

export async function getShifts(
  params?: GetShiftsParams,
): Promise<ListaCortesResponse> {
  const page = params?.page || 1;
  const perPage = params?.perPage || 10;

  const where: {
    folio?: { contains: string; mode: "insensitive" };
    openingDate?: { gte: Date; lte: Date };
    cashierId?: string;
    closingDate?: null | { not: null };
  } = {};

  if (params?.search) {
    where.folio = {
      contains: params.search,
      mode: "insensitive",
    };
  }

  if (params?.startDate && params?.endDate) {
    where.openingDate = {
      gte: params.startDate,
      lte: params.endDate,
    };
  }

  if (params?.cashier) {
    where.cashierId = params.cashier;
  }

  if (params?.status === "abiertos") {
    where.closingDate = null;
  } else if (params?.status === "cerrados") {
    where.closingDate = { not: null };
  }

  const orderByField = params?.orderBy === "folio" ? "folio" : "openingDate";
  const orderDirection = params?.order === "asc" ? "asc" : "desc";

  const total = await prisma.shift.count({ where });

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      cashier: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      [orderByField]: orderDirection,
    },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  return {
    shifts: shifts.map(serializeShift),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

export async function getActiveShift(): Promise<CorteConVentasResponse | null> {
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

  const baseShift = serializeShift(shift);

  return {
    ...baseShift,
    ticketCount: tickets,
    cashAmount,
    debitCardAmount,
    creditCardAmount,
    totalSales,
    inventoryMovements: shift.inventoryMovements.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      ticket: m.ticket ?? undefined,
      total: Number(m.total || 0),
      paymentMethod: m.paymentMethod
        ? mapPaymentMethod(m.paymentMethod)
        : undefined,
      date: m.date,
      product: {
        name: m.product.name,
      },
      member: m.member
        ? {
            memberNumber: m.member.memberNumber,
            name: m.member.name ?? undefined,
          }
        : undefined,
    })),
  };
}

export async function getShiftById(
  id: number,
): Promise<CorteConVentasResponse> {
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

  return {
    ...serializeShift(shift),
    inventoryMovements: shift.inventoryMovements.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      ticket: m.ticket ?? undefined,
      total: Number(m.total || 0),
      paymentMethod: m.paymentMethod
        ? mapPaymentMethod(m.paymentMethod)
        : undefined,
      date: m.date,
      product: {
        name: m.product.name,
      },
      member: m.member
        ? {
            memberNumber: m.member.memberNumber,
            name: m.member.name ?? undefined,
          }
        : undefined,
    })),
  };
}

export async function getAllShifts(limit?: number): Promise<CorteResponse[]> {
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

  return shifts.map(serializeShift);
}

export async function getShiftsBetweenDates(
  startDate: Date,
  endDate: Date,
): Promise<CorteResponse[]> {
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

  return shifts.map(serializeShift);
}

export async function getShiftsByCashier(
  cashierId: string,
  limit?: number,
): Promise<CorteResponse[]> {
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

  return shifts.map(serializeShift);
}

export async function getSalesSummaryByShift(
  shiftId: number,
): Promise<ResumenVentasPorProducto[]> {
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
          total: 0,
        };
      }
      acc[name].quantity += Math.abs(sale.quantity);
      acc[name].total += Number(sale.total || 0);
      return acc;
    },
    {} as Record<string, { product: string; quantity: number; total: number }>,
  );

  return Object.values(summaryByProduct);
}

export async function getPaymentMethodSummary(
  shiftId: number,
): Promise<ResumenPorFormaPago> {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      shiftId,
      type: "SALE",
      isCancelled: false,
    },
  });

  const summary = sales.reduce(
    (acc, sale) => {
      const total = Number(sale.total || 0);
      const method = sale.paymentMethod || "CASH";
      acc[method] += total;
      return acc;
    },
    {
      CASH: 0,
      DEBIT_CARD: 0,
      CREDIT_CARD: 0,
      TRANSFER: 0,
    },
  );

  return summary;
}

export async function getShiftsStatistics(
  startDate?: Date,
  endDate?: Date,
): Promise<EstadisticasCortesResponse> {
  const where: { openingDate?: { gte: Date; lte: Date } } = {};

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
  const totalSales = shifts.reduce((sum, s) => sum + Number(s.totalSales), 0);
  const averageSales = totalShifts > 0 ? totalSales / totalShifts : 0;
  const totalDifferences = shifts.reduce(
    (sum, s) => sum + Math.abs(Number(s.difference)),
    0,
  );

  return {
    totalShifts,
    totalSales,
    averageSales,
    totalDifferences,
  };
}

export async function cancelShift(
  shiftId: number,
  userRole: string,
): Promise<{ success: boolean; message: string }> {
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

export async function getShiftSummary(
  shiftId: number,
): Promise<ResumenCorteResponse> {
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
    throw new Error("Corte no encontrado");
  }

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

  return {
    initialCash: Number(shift.initialCash),
    ticketCount: tickets,
    totalSales,
    cashAmount,
    debitCardAmount,
    creditCardAmount,
    totalWithdrawals: Number(shift.totalWithdrawals || 0),
  };
}
