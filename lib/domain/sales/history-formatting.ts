// lib/domain/sales/history-formatting.ts
// Funciones puras de formateo para el historial de ventas
// SIN dependencias externas (no React, no UI, no fetch)

/**
 * Formatea una fecha al formato local mexicano
 */
export function formatDateMX(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatea un método de pago para visualización.
 * Convierte DEBIT_CARD -> Débito, CREDIT_CARD -> Crédito, etc.
 */
export function formatPaymentMethod(method?: string): string {
  if (!method) return "";
  return method.replace(/_/g, " ");
}

/**
 * Formatea un número a moneda mexicana
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  return num.toFixed(2);
}
