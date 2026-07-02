// Pure helpers — no Prisma, no I/O. Story 1.6: gymStock reconciliation,
// max-ticket reporting, and lightweight consistency checks, all computed
// from the DomainShift[] still in memory from the same sync run (H8 —
// the "Exi Actual" snapshot is never persisted, so this cannot be a
// decoupled DB-only step).

import type { DomainShift } from "./domain.types";

// Currency tolerance for the informational totals comparison (AC5/AC6).
// Not a correctness gate — only flags discrepancies worth an admin's attention.
const TOTALS_TOLERANCE = 1;

export function findMostRecentShift(shifts: DomainShift[]): DomainShift | null {
  const withDate = shifts.filter((s): s is DomainShift & { openingDate: Date } => s.openingDate !== null);
  if (withDate.length === 0) return null;
  return withDate.reduce((latest, s) => (s.openingDate > latest.openingDate ? s : latest));
}

// Tickets are numeric strings in the historical data (e.g. "5763"). Non-numeric
// tickets are ignored for this comparison rather than breaking the max.
export function computeMaxTicket(shifts: DomainShift[]): string | null {
  let max: { raw: string; value: number } | null = null;
  for (const shift of shifts) {
    for (const sale of shift.sales) {
      const value = parseInt(sale.ticket, 10);
      if (isNaN(value)) continue;
      if (!max || value > max.value) max = { raw: sale.ticket, value };
    }
  }
  return max?.raw ?? null;
}

export interface GymStockUpdate {
  productName: string;
  gymStock: number;
}

// One update per product row in the most recent shift's Inventario sheet —
// direct snapshot assignment ("Exi Actual"), not a delta.
export function buildGymStockUpdates(shift: DomainShift): GymStockUpdate[] {
  return shift.inventory.map((row) => ({ productName: row.productName, gymStock: row.gymStock }));
}

export interface ShiftTotalsCheck {
  folio: string;
  expected: number;
  actual: number;
  withinTolerance: boolean;
}

// Compares Shift.totalSales (direct from Cierre) against the sum of
// non-cancelled sale totals (price - discount + surcharge) — informational
// only, per H11 (Epic 2 owns the exhaustive reconciliation).
export function compareShiftTotals(shift: DomainShift): ShiftTotalsCheck {
  const actual = shift.sales
    .filter((sale) => !sale.isCancelled)
    .reduce((sum, sale) => sum + (sale.price - sale.discount + sale.surcharge), 0);
  const expected = shift.totalSales;
  return {
    folio: shift.folio,
    expected,
    actual,
    withinTolerance: Math.abs(expected - actual) <= TOTALS_TOLERANCE,
  };
}
