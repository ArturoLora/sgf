// services/reports.service.ts
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { serializeDecimal } from "./utils";

// ==================== TYPES ====================

export interface ReportPeriodParams {
  startDate: Date;
  endDate: Date;
}

export interface SalesReportByProduct {
  productId: number;
  productName: string;
  quantitySold: number;
  totalSales: Decimal;
  quantityCancelled: number;
  totalCancelled: Decimal;
}

export interface DailySalesReport {
  date: string;
  ticketCount: number;
  totalSales: Decimal;
  totalCancelled: Decimal;
}

// ==================== HELPERS ====================

function toDecimal(value: number | Decimal): Decimal {
  return new Decimal(value.toString());
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ==================== SALES REPORTS ====================

/**
 * Reporte de ventas por producto en un período
 */
export async function getSalesReportByProduct(
  params: ReportPeriodParams,
): Promise<SalesReportByProduct[]> {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      type: "SALE",
      date: {
        gte: params.startDate,
        lte: params.endDate,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const reportByProduct = sales.reduce(
    (acc, sale) => {
      const id = sale.product.id;
      if (!acc[id]) {
        acc[id] = {
          productId: id,
          productName: sale.product.name,
          quantitySold: 0,
          totalSales: new Decimal(0),
          quantityCancelled: 0,
          totalCancelled: new Decimal(0),
        };
      }

      const quantity = Math.abs(sale.quantity);
      const total = toDecimal(sale.total || 0);

      if (sale.isCancelled) {
        acc[id].quantityCancelled += quantity;
        acc[id].totalCancelled = acc[id].totalCancelled.plus(total);
      } else {
        acc[id].quantitySold += quantity;
        acc[id].totalSales = acc[id].totalSales.plus(total);
      }

      return acc;
    },
    {} as Record<number, SalesReportByProduct>,
  );

  return Object.values(reportByProduct).sort(
    (a, b) => Number(b.totalSales) - Number(a.totalSales),
  );
}

/**
 * Reporte de ventas diarias
 */
export async function getDailySalesReport(
  params: ReportPeriodParams,
): Promise<DailySalesReport[]> {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      type: "SALE",
      date: {
        gte: params.startDate,
        lte: params.endDate,
      },
    },
  });

  const salesByDay = sales.reduce(
    (acc, sale) => {
      const date = formatDate(sale.date);
      if (!acc[date]) {
        acc[date] = {
          date,
          tickets: new Set<string>(),
          totalSales: new Decimal(0),
          totalCancelled: new Decimal(0),
        };
      }

      if (sale.ticket) {
        acc[date].tickets.add(sale.ticket);
      }

      const total = toDecimal(sale.total || 0);

      if (sale.isCancelled) {
        acc[date].totalCancelled = acc[date].totalCancelled.plus(total);
      } else {
        acc[date].totalSales = acc[date].totalSales.plus(total);
      }

      return acc;
    },
    {} as Record<
      string,
      {
        date: string;
        tickets: Set<string>;
        totalSales: Decimal;
        totalCancelled: Decimal;
      }
    >,
  );

  return Object.values(salesByDay)
    .map((day) => ({
      date: day.date,
      ticketCount: day.tickets.size,
      totalSales: day.totalSales,
      totalCancelled: day.totalCancelled,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Reporte de ventas por forma de pago
 */
export async function getSalesByPaymentMethod(params: ReportPeriodParams) {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      type: "SALE",
      isCancelled: false,
      date: {
        gte: params.startDate,
        lte: params.endDate,
      },
    },
  });

  const report = sales.reduce(
    (acc, sale) => {
      const method = sale.paymentMethod || "CASH";
      const total = toDecimal(sale.total || 0);

      acc[method].quantity += 1;
      acc[method].total = acc[method].total.plus(total);

      return acc;
    },
    {
      CASH: { paymentMethod: "CASH", quantity: 0, total: new Decimal(0) },
      DEBIT_CARD: {
        paymentMethod: "DEBIT_CARD",
        quantity: 0,
        total: new Decimal(0),
      },
      CREDIT_CARD: {
        paymentMethod: "CREDIT_CARD",
        quantity: 0,
        total: new Decimal(0),
      },
      TRANSFER: {
        paymentMethod: "TRANSFER",
        quantity: 0,
        total: new Decimal(0),
      },
    },
  );

  return Object.values(report);
}

/**
 * Reporte de ventas canceladas
 */
export async function getCancelledSalesReport(params: ReportPeriodParams) {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      type: "SALE",
      isCancelled: true,
      cancellationDate: {
        gte: params.startDate,
        lte: params.endDate,
      },
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
    orderBy: { cancellationDate: "desc" },
  });

  const totalCancelled = sales.reduce(
    (sum, v) => sum.plus(toDecimal(v.total || 0)),
    new Decimal(0),
  );

  return {
    sales,
    totalCancelled,
    cancellationCount: sales.length,
  };
}

// ==================== INVENTORY REPORTS ====================

/**
 * Reporte de movimientos de inventario
 */
export async function getInventoryMovementsReport(params: ReportPeriodParams) {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      date: {
        gte: params.startDate,
        lte: params.endDate,
      },
    },
    include: {
      product: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });

  const summaryByType = movements.reduce(
    (acc, mov) => {
      const type = mov.type;
      if (!acc[type]) {
        acc[type] = {
          type,
          quantity: 0,
        };
      }
      acc[type].quantity += 1;
      return acc;
    },
    {} as Record<string, { type: string; quantity: number }>,
  );

  return {
    movements,
    summaryByType: Object.values(summaryByType),
  };
}

/**
 * Reporte de stock actual
 */
export async function getCurrentStockReport() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const stockSummary = products.reduce(
    (acc, p) => {
      acc.warehouse += p.warehouseStock;
      acc.gym += p.gymStock;
      acc.total += p.warehouseStock + p.gymStock;
      acc.totalValue += Number(p.salePrice) * (p.warehouseStock + p.gymStock);
      return acc;
    },
    { warehouse: 0, gym: 0, total: 0, totalValue: 0 },
  );

  const lowStock = products.filter(
    (p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock,
  );

  return serializeDecimal({
    products,
    stockSummary,
    lowStock,
  });
}

// ==================== MEMBER REPORTS ====================

/**
 * Reporte de socios por tipo de membresía
 */
export async function getMembersByMembershipReport() {
  const members = await prisma.member.groupBy({
    by: ["membershipType", "isActive"],
    _count: true,
  });

  return members.map((m) => ({
    membershipType: m.membershipType || "NO_MEMBERSHIP",
    isActive: m.isActive,
    quantity: m._count,
  }));
}

/**
 * Reporte de nuevos socios
 */
export async function getNewMembersReport(params: ReportPeriodParams) {
  const members = await prisma.member.findMany({
    where: {
      createdAt: {
        gte: params.startDate,
        lte: params.endDate,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const byDay = members.reduce(
    (acc, member) => {
      const date = formatDate(member.createdAt);
      if (!acc[date]) {
        acc[date] = {
          date,
          quantity: 0,
        };
      }
      acc[date].quantity += 1;
      return acc;
    },
    {} as Record<string, { date: string; quantity: number }>,
  );

  return {
    members,
    byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    total: members.length,
  };
}

/**
 * Reporte de visitas de socios
 */
export async function getMemberVisitsReport(params: ReportPeriodParams) {
  const visits = await prisma.inventoryMovement.findMany({
    where: {
      type: "SALE",
      isCancelled: false,
      memberId: { not: null },
      date: {
        gte: params.startDate,
        lte: params.endDate,
      },
    },
    include: {
      member: {
        select: {
          memberNumber: true,
          name: true,
          membershipType: true,
        },
      },
    },
  });

  const visitsByMember = visits.reduce(
    (acc, visit) => {
      const memberId = visit.memberId!;
      if (!acc[memberId]) {
        acc[memberId] = {
          member: visit.member!,
          visitCount: 0,
        };
      }
      acc[memberId].visitCount += 1;
      return acc;
    },
    {} as Record<number, { member: any; visitCount: number }>,
  );

  return Object.values(visitsByMember).sort(
    (a, b) => b.visitCount - a.visitCount,
  );
}

// ==================== DASHBOARD ====================

/**
 * Resumen para dashboard
 */
export async function getDashboardSummary(params?: ReportPeriodParams) {
  const startDate =
    params?.startDate || new Date(new Date().setHours(0, 0, 0, 0));
  const endDate =
    params?.endDate || new Date(new Date().setHours(23, 59, 59, 999));

  const [salesToday, activeMembers, activeProducts, activeShift] =
    await Promise.all([
      prisma.inventoryMovement.findMany({
        where: {
          type: "SALE",
          isCancelled: false,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.member.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.shift.findFirst({
        where: { closingDate: null },
        include: {
          cashier: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

  const totalSalesToday = salesToday.reduce(
    (sum, v) => sum.plus(toDecimal(v.total || 0)),
    new Decimal(0),
  );

  const ticketsToday = new Set(salesToday.map((v) => v.ticket)).size;

  const productsLowStock = await prisma.product.count({
    where: {
      isActive: true,
      OR: [
        {
          gymStock: {
            lt: prisma.product.fields.minStock,
          },
        },
        {
          warehouseStock: {
            lt: prisma.product.fields.minStock,
          },
        },
      ],
    },
  });

  return {
    salesToday: {
      total: totalSalesToday,
      tickets: ticketsToday,
      quantity: salesToday.length,
    },
    members: {
      active: activeMembers,
    },
    products: {
      active: activeProducts,
      lowStock: productsLowStock,
    },
    activeShift,
  };
}

// ==================== SHIFT REPORTS ====================

/**
 * Reporte de cortes
 */
export async function getShiftsReport(params: ReportPeriodParams) {
  const shifts = await prisma.shift.findMany({
    where: {
      openingDate: {
        gte: params.startDate,
        lte: params.endDate,
      },
    },
    include: {
      cashier: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { openingDate: "desc" },
  });

  const totalSales = shifts.reduce(
    (sum, s) => sum.plus(toDecimal(s.totalSales)),
    new Decimal(0),
  );

  const totalDifferences = shifts.reduce(
    (sum, s) => sum.plus(toDecimal(Math.abs(Number(s.difference)))),
    new Decimal(0),
  );

  const averageSales =
    shifts.length > 0 ? totalSales.dividedBy(shifts.length) : new Decimal(0);

  return {
    shifts,
    summary: {
      totalShifts: shifts.length,
      totalSales,
      totalDifferences,
      averageSales,
    },
  };
}
