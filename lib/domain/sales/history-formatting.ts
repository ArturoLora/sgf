// lib/domain/sales/history-formatting.ts
// Formateo del historial de ventas
// FASE 7C: funciones genéricas delegadas a shared
// Lógica específica de ventas permanece aquí

import { formatearFechaHora, formatearDecimal } from "../shared/formatters";

/**
 * Formatea una fecha al formato local mexicano.
 * Delegado a shared/formatters.formatearFechaHora
 */
export function formatDateMX(date: Date | string): string {
  return formatearFechaHora(date);
}

/**
 * Formatea un método de pago para visualización.
 * Lógica específica del dominio de ventas.
 */
export function formatPaymentMethod(method?: string): string {
  if (!method) return "";
  return method.replace(/_/g, " ");
}

/**
 * Formatea un número a dos decimales sin símbolo.
 * Delegado a shared/formatters.formatearDecimal
 */
export function formatCurrency(amount: number | string): string {
  return formatearDecimal(amount);
}
