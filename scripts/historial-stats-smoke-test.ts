// Story A2: calculateHistorialStats() ya existía, sin cobertura de smoke.
// Ahora se usa server-side sobre el universo completo (getSalesHistory()) en
// vez de solo client-side sobre la página actual — este test documenta y
// protege exactamente esa distinción: stats sobre el universo completo deben
// diferir de stats sobre una página parcial cuando hay más tickets que
// perPage.
import { calculateHistorialStats } from "../lib/domain/sales/history-calculations";
import type { TicketAgrupado } from "../lib/domain/sales/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function buildTicket(overrides: Partial<TicketAgrupado>): TicketAgrupado {
  return {
    ticket: "T1",
    date: new Date("2026-01-01"),
    total: 0,
    cashier: "Cajero",
    isCancelled: false,
    items: [],
    ...overrides,
  };
}

console.log("\ncalculateHistorialStats — universo completo vs página (Story A2)");
{
  // Universo completo: 3 tickets, uno cancelado, con items.
  const universoCompleto: TicketAgrupado[] = [
    buildTicket({ ticket: "T1", total: 100, items: [{ id: 1, product: { name: "A" }, quantity: 1, total: 100 }] }),
    buildTicket({ ticket: "T2", total: 50, isCancelled: true, items: [{ id: 2, product: { name: "B" }, quantity: 1, total: 50 }] }),
    buildTicket({ ticket: "T3", total: 200, items: [{ id: 3, product: { name: "C" }, quantity: 2, total: 200 }] }),
  ];
  // "Página actual" simulada — solo el primer ticket (perPage=1).
  const paginaActual = universoCompleto.slice(0, 1);

  const statsCompletas = calculateHistorialStats(universoCompleto);
  const statsPagina = calculateHistorialStats(paginaActual);

  assert(statsCompletas.uniqueTickets === 3, "universo completo: uniqueTickets = 3");
  assert(statsCompletas.totalValue === 350, "universo completo: totalValue = 100+50+200");
  assert(statsCompletas.cancelled === 1, "universo completo: cancelled = 1");
  assert(statsCompletas.totalItems === 3, "universo completo: totalItems = 3 (1 item por ticket)");

  assert(statsPagina.uniqueTickets === 1, "página parcial: uniqueTickets = 1 (solo lo paginado)");
  assert(
    statsCompletas.uniqueTickets !== statsPagina.uniqueTickets &&
      statsCompletas.totalValue !== statsPagina.totalValue,
    "stats de universo completo difieren de stats de una página parcial — confirma que agregar sobre la página actual es incorrecto",
  );
}

console.log(`\n──────────────────────────────────────────`);
console.log(`historial-stats smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
