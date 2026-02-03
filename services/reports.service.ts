// services/reports.service.ts
import { prisma } from "@/lib/db";
import {
  ReportPeriodQuerySchema,
  DashboardQuerySchema,
} from "@/types/api/reports";
import type {
  ReporteVentasPorProducto,
  ReporteVentasDiarias,
  ReporteStockActual,
  ResumenDashboard,
  ReportPeriodQueryInput,
  DashboardQueryInput,
} from "@/types/api/reports";

export interface ReportPeriodParams {
  startDate: Date;
  endDate: Date;
}

export interface DashboardParams {
  startDate?: Date;
  endDate?: Date;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ==================== PARSING HELPERS ====================

export function parseReportPeriodQuery(
  raw: ReportPeriodQueryInput,
): ReportPeriodParams {
  const validated = ReportPeriodQuerySchema.parse(raw);

  const startDate = new Date(validated.startDate);
  const endDate = new Date(validated.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Fechas inválidas");
  }

  return { startDate, endDate };
}

export function parseDashboardQuery(raw: DashboardQueryInput): DashboardParams {
  const validated = DashboardQuerySchema.parse(raw);

  return {
    startDate: validated.startDate ? new Date(validated.startDate) : undefined,
    endDate: validated.endDate ? new Date(validated.endDate) : undefined,
  };
}

// ==================== REPORT SERVICES ====================

export async function getSalesReportByProduct(
  params: ReportPeriodParams,
): Promise<ReporteVentasPorProducto[]> {
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
          totalSales: 0,
          quantityCancelled: 0,
          totalCancelled: 0,
        };
      }

      const quantity = Math.abs(sale.quantity);
      const total = Number(sale.total || 0);

      if (sale.isCancelled) {
        acc[id].quantityCancelled += quantity;
        acc[id].totalCancelled += total;
      } else {
        acc[id].quantitySold += quantity;
        acc[id].totalSales += total;
      }

      return acc;
    },
    {} as Record<number, ReporteVentasPorProducto>,
  );

  return Object.values(reportByProduct).sort(
    (a, b) => b.totalSales - a.totalSales,
  );
}

export async function getDailySalesReport(
  params: ReportPeriodParams,
): Promise<ReporteVentasDiarias[]> {
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
          totalSales: 0,
          totalCancelled: 0,
        };
      }

      if (sale.ticket) {
        acc[date].tickets.add(sale.ticket);
      }

      const total = Number(sale.total || 0);

      if (sale.isCancelled) {
        acc[date].totalCancelled += total;
      } else {
        acc[date].totalSales += total;
      }

      return acc;
    },
    {} as Record<
      string,
      {
        date: string;
        tickets: Set<string>;
        totalSales: number;
        totalCancelled: number;
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

export async function getCurrentStockReport(): Promise<ReporteStockActual> {
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

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      warehouseStock: p.warehouseStock,
      gymStock: p.gymStock,
      minStock: p.minStock,
      salePrice: Number(p.salePrice),
    })),
    stockSummary,
    lowStock: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      warehouseStock: p.warehouseStock,
      gymStock: p.gymStock,
      minStock: p.minStock,
    })),
  };
}

export async function getDashboardSummary(
  params?: DashboardParams,
): Promise<ResumenDashboard> {
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
    (sum, v) => sum + Number(v.total || 0),
    0,
  );

  const ticketsToday = new Set(salesToday.map((v) => v.ticket)).size;

  const productsLowStock = await prisma.product.count({
    where: {
      isActive: true,
      OR: [
        { gymStock: { lt: prisma.product.fields.minStock } },
        { warehouseStock: { lt: prisma.product.fields.minStock } },
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
    activeShift: activeShift
      ? {
          id: activeShift.id,
          folio: activeShift.folio,
          cashier: {
            name: activeShift.cashier.name,
          },
          openingDate: activeShift.openingDate,
          initialCash: Number(activeShift.initialCash),
        }
      : undefined,
  };
}
