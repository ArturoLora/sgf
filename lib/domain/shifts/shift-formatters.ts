// lib/domain/shifts/shift-formatters.ts

/**
 * Domain Layer - Formateadores de Cortes
 * Responsabilidad: Formateo de datos para presentación
 */

/**
 * Formatea una fecha a formato local español
 */
export function formatearFechaCorte(fecha: string | Date): string {
  return new Date(fecha).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatea una fecha a formato largo
 */
export function formatearFechaLarga(fecha: string | Date): string {
  return new Date(fecha).toLocaleString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatea un monto a moneda local
 */
export function formatearMontoCorte(monto: number): string {
  return `$${monto.toFixed(2)}`;
}
