import type { ReporteStockActual } from "@/types/api/reports";

export async function getCurrentStockReport(): Promise<ReporteStockActual> {
  const res = await fetch("/api/inventory/report/stock", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Error al obtener reporte de stock actual");
  }

  return res.json() as Promise<ReporteStockActual>;
}
