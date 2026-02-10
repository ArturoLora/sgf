// lib/domain/sales/history-filters.ts
// Funciones puras de dominio para filtros de historial de ventas
// Sin fetch, sin React, sin UI

import type { HistorialVentasFilters } from "@/types/api/sales";

/**
 * Valores por defecto para los filtros del historial
 */
export const DEFAULT_HISTORY_FILTERS: HistorialVentasFilters = {
  search: "",
  startDate: "",
  endDate: "",
  cashier: "todos",
  product: "todos",
  member: "todos",
  paymentMethod: "todos",
  productType: "todos",
  orderBy: "date_desc",
  onlyActive: true,
};

/**
 * Calcula rango de fechas basado en un preset
 */
export function normalizeDateFilter(type: "today" | "week" | "month"): {
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  const endDate = today.toISOString().split("T")[0];
  let startDate = "";

  switch (type) {
    case "today":
      startDate = endDate;
      break;
    case "week": {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split("T")[0];
      break;
    }
    case "month": {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().split("T")[0];
      break;
    }
  }

  return { startDate, endDate };
}

/**
 * Determina si hay filtros activos (distintos a los valores por defecto)
 */
export function hasActiveFilters(filters: HistorialVentasFilters): boolean {
  return !!(
    filters.search ||
    filters.startDate ||
    filters.endDate ||
    (filters.cashier && filters.cashier !== "todos") ||
    (filters.product && filters.product !== "todos") ||
    (filters.member && filters.member !== "todos") ||
    (filters.paymentMethod && filters.paymentMethod !== "todos") ||
    (filters.productType && filters.productType !== "todos") ||
    !filters.onlyActive
  );
}

/**
 * Construye filtros con un rango de fechas preset aplicado
 */
export function buildFiltersWithDateRange(
  currentFilters: HistorialVentasFilters,
  dateRange: "today" | "week" | "month",
): HistorialVentasFilters {
  const { startDate, endDate } = normalizeDateFilter(dateRange);
  return {
    ...currentFilters,
    startDate,
    endDate,
  };
}
