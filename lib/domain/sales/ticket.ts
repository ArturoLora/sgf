// lib/domain/sales/ticket.ts

/**
 * Genera un número de ticket único para una venta
 * Formato: VEN-{timestamp}-{random}
 */
export function generateTicket(): string {
  return `VEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
