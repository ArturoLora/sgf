// lib/domain/reports/guards.ts
// Type guards puros para el dominio de reportes
// SIN dependencias externas

import type { ReporteStockActual } from "./types";

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
