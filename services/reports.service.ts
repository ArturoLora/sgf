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
// FASE 8D: Delegación a dominio
import { formatearFechaISO } from "@/lib/domain/shared/formatters";

export interface ReportPeriodParams {
  startDate: Date;
  endDate: Date;
}

export interface DashboardParams {
  startDate?: Date;
  endDate?: Date;
}

// FASE 8D: formatDate delegado a lib/domain/shared/formatters → formatearFechaISO
// La función local se elimina; se usa directamente el helper de dominio compartido.

// ==================== PARSING HELPERS ====================

export function parseReportPeriodQuery(
  raw: ReportPeriodQueryInput,
): ReportPeriodParams {
  const validated = ReportPeriodQuerySchema.parse(raw);
  const startDate = new Date(validated.startDate);
  const endDate = new Date(validated.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
    throw new Error("Fechas inválidas");
  return { startDate, endDate };
}

export function parseDashboardQuery(raw: DashboardQueryInput): DashboardParams {
  const validated = DashboardQuerySchema.parse(raw);
  return {
    startDate: validated.startDate ? new Date(validated.startDate) : undefined,
    endDate: validated.endDate ? new Date(validated.endDate) : undefined,
  };
}

// ==================== INTERNAL: LOW STOCK QUERY ====================
// Duplica la consulta de products.service intencionalmente para mantener
// reports como contexto autónomo sin importar otros services.
//
// DEUDA ACEPTADA (FASE 8D): No existe función de dominio equivalente para
// queryLowStockProducts. La lógica de filtrado y mapeo permanece en el service.

interface ProductoBajoStockInterno {
  id: number;
  name: string;
  gymStock: number;
  warehouseStock: number;
  minStock: number;
  stockFaltante: { gym: number; warehouse: number };
}

async function queryLowStockProducts(): Promise<ProductoBajoStockInterno[]> {
  const products = await prisma.product.findMany({ where: { isActive: true } });

  return products
    .filter((p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock)
    .map((p) => ({
      id: p.id,
      name: p.name,
      gymStock: p.gymStock,
      warehouseStock: p.warehouseStock,
      minStock: p.minStock,
      stockFaltante: {
        gym: Math.max(0, p.minStock - p.gymStock),
        warehouse: Math.max(0, p.minStock - p.warehouseStock),
      },
    }));
}

// ==================== REPORT SERVICES ====================

export async function getSalesReportByProduct(
  params: ReportPeriodParams,
): Promise<ReporteVentasPorProducto[]> {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      type: "SALE",
      date: { gte: params.startDate, lte: params.endDate },
    },
    include: {
      product: { select: { id: true, name: true } },
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
      date: { gte: params.startDate, lte: params.endDate },
    },
  });

  const salesByDay = sales.reduce(
    (acc, sale) => {
      // FASE 8D: formatDate delegado a formatearFechaISO (lib/domain/shared/formatters)
      const date = formatearFechaISO(sale.date);
      if (!acc[date]) {
        acc[date] = {
          date,
          tickets: new Set<string>(),
          totalSales: 0,
          totalCancelled: 0,
        };
      }

      if (sale.ticket) acc[date].tickets.add(sale.ticket);

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

  // DEUDA ACEPTADA (FASE 8D): No existe función de dominio que encapsule
  // la construcción del stockSummary completo desde un array de productos Prisma.
  // lib/domain/reports/calculations provee getTotalStockValue y getTotalUnits,
  // pero operan sobre ReporteStockActual ya construido, no sobre el array raw.
  // La lógica de reduce permanece en el service.
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

  const lowStock = await queryLowStockProducts();

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
    lowStock,
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
          date: { gte: startDate, lte: endDate },
        },
      }),
      prisma.member.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.shift.findFirst({
        where: { closingDate: null },
        include: {
          cashier: { select: { name: true } },
        },
      }),
    ]);

  const totalSalesToday = salesToday.reduce(
    (sum, v) => sum + Number(v.total || 0),
    0,
  );

  const ticketsToday = new Set(salesToday.map((v) => v.ticket)).size;

  // DEUDA ACEPTADA (FASE 8D): No existe función de dominio equivalente para
  // contar productos bajo stock usando campos relacionales de Prisma (lt: fields.minStock).
  // La query ORM permanece en el service.
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
    members: { active: activeMembers },
    products: { active: activeProducts, lowStock: productsLowStock },
    activeShift: activeShift
      ? {
          id: activeShift.id,
          folio: activeShift.folio,
          cashier: { name: activeShift.cashier.name },
          openingDate: activeShift.openingDate,
          initialCash: Number(activeShift.initialCash),
        }
      : undefined,
  };
}
