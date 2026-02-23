// lib/domain/sales/history-calculations.ts
// Funciones puras de cálculo para historial de ventas
// SIN dependencias externas

import type { TicketAgrupado, HistorialStats } from "./types";

/**
 * Calcula estadísticas agregadas a partir de una lista de tickets
 */
export function calculateHistorialStats(
  tickets: TicketAgrupado[],
): HistorialStats {
  const totalValue = tickets.reduce(
    (sum, ticket) => sum + Number(ticket.total),
    0,
  );
  const cancelled = tickets.filter((ticket) => ticket.isCancelled).length;
  const totalItems = tickets.reduce(
    (sum, ticket) => sum + ticket.items.length,
    0,
  );

  return {
    totalValue,
    uniqueTickets: tickets.length,
    cancelled,
    totalItems,
  };
}
