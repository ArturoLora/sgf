import type { ReporteStockActual } from "@/types/api/reports";

export function isReporteStockActual(
  value: unknown,
): value is ReporteStockActual {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v["products"]) &&
    Array.isArray(v["lowStock"]) &&
    typeof v["stockSummary"] === "object"
  );
}
