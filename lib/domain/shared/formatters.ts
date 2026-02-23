// lib/domain/shared/formatters.ts
// Utilidades de formateo compartidas entre módulos del dominio
// SIN dependencias externas

/**
 * Formatea un número a moneda con dos decimales
 */
export function formatearMoneda(valor: number): string {
  return `$${Number(valor).toFixed(2)}`;
}

/**
 * Formatea un número a dos decimales (sin símbolo)
 */
export function formatearDecimal(valor: number | string): string {
  const num = typeof valor === "string" ? Number(valor) : valor;
  return num.toFixed(2);
}

/**
 * Formatea una fecha a formato local mexicano corto
 */
export function formatearFechaCorta(fecha: string | Date | undefined): string {
  if (!fecha) return "-";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formatea una fecha a formato local mexicano largo
 */
export function formatearFechaLarga(fecha: string | Date | undefined): string {
  if (!fecha) return "-";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formatea una fecha con hora al formato local mexicano
 */
export function formatearFechaHora(fecha: string | Date | undefined): string {
  if (!fecha) return "-";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatea una fecha a string ISO (YYYY-MM-DD)
 */
export function formatearFechaISO(fecha: string | Date | undefined): string {
  if (!fecha) return "";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toISOString().split("T")[0];
}
