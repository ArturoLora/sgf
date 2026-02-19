import type { ReporteStockActual } from "@/types/api/reports";

export function getTotalProducts(report: ReporteStockActual): number {
  return report.products.length;
}

export function getLowStockCount(report: ReporteStockActual): number {
  return report.lowStock.length;
}

export function getTotalStockValue(report: ReporteStockActual): number {
  return report.stockSummary.totalValue;
}

export function getTotalUnits(report: ReporteStockActual): number {
  return report.stockSummary.total;
}
