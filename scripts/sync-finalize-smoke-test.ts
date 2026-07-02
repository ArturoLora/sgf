import {
  findMostRecentShift,
  computeMaxTicket,
  buildGymStockUpdates,
  compareShiftTotals,
} from "../modules/migration/domain/sync-finalize";
import type { DomainShift, DomainSale, DomainInventoryRow } from "../modules/migration/domain/domain.types";

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

function makeSale(overrides: Partial<DomainSale> = {}): DomainSale {
  return {
    ticket: "1", saleDate: null, memberNumber: null, memberName: null,
    description: "VISITA", paymentMethod: "CASH", sellerName: null,
    price: 50, discount: 0, surcharge: 0, isCancelled: false, isMembership: false,
    ...overrides,
  };
}

function makeInventoryRow(overrides: Partial<DomainInventoryRow> = {}): DomainInventoryRow {
  return { productName: "AGUA 1L", gymStock: 10, warehouseStock: 0, adjustment: 0, entries: 0, ...overrides };
}

function makeShift(overrides: Partial<DomainShift> = {}): DomainShift {
  return {
    folio: "FN-1", openingDate: new Date("2026-01-01T00:00:00Z"), openingTime: null, closingTime: null,
    cashierName: "ANDREW", sales: [], inventory: [], withdrawals: [], legacyNotes: null,
    initialCash: 0, ticketCount: 0, membershipSales: 0, productSales0Tax: 0, productSales16Tax: 0,
    subtotal: 0, tax: 0, totalSales: 0, cashAmount: 0, debitCardAmount: 0, creditCardAmount: 0,
    totalVoucher: 0, totalWithdrawalsAmount: 0, totalCash: 0,
    ...overrides,
  };
}

// ── findMostRecentShift ───────────────────────────────────────────────────────
console.log("\nfindMostRecentShift");
{
  assert(findMostRecentShift([]) === null, "empty array → null");

  const a = makeShift({ folio: "FN-1", openingDate: new Date("2026-01-07T00:00:00Z") });
  const b = makeShift({ folio: "FN-2", openingDate: new Date("2026-01-13T00:00:00Z") });
  const c = makeShift({ folio: "FN-3", openingDate: null });
  const result = findMostRecentShift([a, b, c]);
  assert(result?.folio === "FN-2", "picks the latest openingDate, ignores null-date shifts");
}

// ── computeMaxTicket ───────────────────────────────────────────────────────────
console.log("\ncomputeMaxTicket");
{
  assert(computeMaxTicket([]) === null, "no shifts → null");

  const shift1 = makeShift({ sales: [makeSale({ ticket: "5750" }), makeSale({ ticket: "5763" })] });
  const shift2 = makeShift({ sales: [makeSale({ ticket: "5900" }), makeSale({ ticket: "5780" })] });
  assert(computeMaxTicket([shift1, shift2]) === "5900", "finds numeric max across shifts");

  const withNonNumeric = makeShift({ sales: [makeSale({ ticket: "5750" }), makeSale({ ticket: "VOUCHER-1" })] });
  assert(computeMaxTicket([withNonNumeric]) === "5750", "non-numeric tickets ignored, not crashing");
}

// ── buildGymStockUpdates ─────────────────────────────────────────────────────
console.log("\nbuildGymStockUpdates");
{
  const shift = makeShift({
    inventory: [makeInventoryRow({ productName: "AGUA 1L", gymStock: 42 }), makeInventoryRow({ productName: "VISITA", gymStock: 0 })],
  });
  const updates = buildGymStockUpdates(shift);
  assert(updates.length === 2, "one update per inventory row");
  assert(updates[0].productName === "AGUA 1L" && updates[0].gymStock === 42, "snapshot value passthrough, not a delta");
}

// ── compareShiftTotals ────────────────────────────────────────────────────────
console.log("\ncompareShiftTotals");
{
  const matching = makeShift({
    totalSales: 100,
    sales: [makeSale({ price: 50 }), makeSale({ price: 50 })],
  });
  const checkMatching = compareShiftTotals(matching);
  assert(checkMatching.withinTolerance, "sums match within tolerance");

  const mismatched = makeShift({
    totalSales: 100,
    sales: [makeSale({ price: 50 })],
  });
  const checkMismatched = compareShiftTotals(mismatched);
  assert(!checkMismatched.withinTolerance, "flags real discrepancy");

  const withCancelled = makeShift({
    totalSales: 50,
    sales: [makeSale({ price: 50 }), makeSale({ price: 999, isCancelled: true })],
  });
  const checkCancelled = compareShiftTotals(withCancelled);
  assert(checkCancelled.withinTolerance, "cancelled sales excluded from actual total");

  const withDiscount = makeShift({
    totalSales: 45,
    sales: [makeSale({ price: 50, discount: 5 })],
  });
  assert(compareShiftTotals(withDiscount).withinTolerance, "discount/surcharge applied to actual total");
}

console.log(`\n──────────────────────────────────────────`);
console.log(`sync-finalize smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
