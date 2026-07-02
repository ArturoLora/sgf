import {
  buildShiftUpsertData,
  buildSaleMovementData,
  buildInventoryAdjustmentMovements,
  buildWithdrawalData,
  combineDateAndTime,
  type ShiftFinancials,
} from "../modules/migration/domain/shift-sync";
import type { DomainSale, DomainInventoryRow, DomainWithdrawal } from "../modules/migration/domain/domain.types";

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

const financials: ShiftFinancials = {
  initialCash: 1000,
  ticketCount: 34,
  membershipSales: 0,
  productSales0Tax: 6344,
  productSales16Tax: 0,
  subtotal: 5580,
  tax: 764,
  totalSales: 6344,
  cashAmount: 6344,
  debitCardAmount: 0,
  creditCardAmount: 0,
  totalVoucher: 0,
  totalWithdrawalsAmount: 0,
  totalCash: 7344,
};

// ── combineDateAndTime ─────────────────────────────────────────────────────────
console.log("\ncombineDateAndTime");
{
  const day = new Date("2026-01-07T00:00:00.000Z");
  const combined = combineDateAndTime(day, "13:53");
  assert(combined.getHours() === 13 && combined.getMinutes() === 53, "HH:mm applied to date");

  const noTime = combineDateAndTime(day, null);
  assert(noTime.getTime() === day.getTime(), "null time falls back to date unchanged");

  const badTime = combineDateAndTime(day, "not-a-time");
  assert(badTime.getTime() === day.getTime(), "unparseable time falls back to date unchanged");
}

// ── buildShiftUpsertData ──────────────────────────────────────────────────────
console.log("\nbuildShiftUpsertData");
{
  const day = new Date("2026-01-07T00:00:00.000Z");
  const data = buildShiftUpsertData("FN-248", "user-1", day, "13:53", "22:24", financials, null);
  assert(data.folio === "FN-248", "folio passthrough");
  assert(data.cashierId === "user-1", "cashierId passthrough");
  assert(data.openingDate.getHours() === 13 && data.openingDate.getMinutes() === 53, "openingDate combines day + openingTime");
  assert(data.closingDate.getHours() === 22 && data.closingDate.getMinutes() === 24, "closingDate combines day + closingTime");
  assert(data.closingDate !== null && data.closingDate !== undefined, "closingDate is always set — imported shifts are never left open");
  assert(data.cashAmount === 6344, "cashAmount mapped from Ventas Efectivo block");
  assert(data.totalWithdrawals === 0, "totalWithdrawalsAmount mapped to totalWithdrawals");
  assert(data.notes === null, "notes null when no legacy fields");
}

{
  const day = new Date("2026-01-13T00:00:00.000Z");
  const data = buildShiftUpsertData("FN-249", "user-1", day, null, null, financials, '{"legacyFields":"Anticipo: $150.00"}');
  assert(data.notes === '{"legacyFields":"Anticipo: $150.00"}', "notes passthrough when legacy fields present");
  assert(data.closingDate.getTime() === day.getTime(), "closingDate still set (as day) even when closingTime missing — never left open");
}

// ── buildSaleMovementData ─────────────────────────────────────────────────────
console.log("\nbuildSaleMovementData");
{
  const sale: DomainSale = {
    ticket: "5763",
    saleDate: new Date("2026-01-07T15:48:00.000Z"),
    memberNumber: null,
    memberName: null,
    description: "VISITA",
    paymentMethod: "CASH",
    sellerName: "CARLOS",
    price: 50,
    discount: 0,
    surcharge: 0,
    isCancelled: false,
    isMembership: false,
  };
  const fallback = new Date("2026-01-07T00:00:00.000Z");
  const movement = buildSaleMovementData(sale, fallback);
  assert(movement.type === "SALE", "type = SALE");
  assert(movement.ticket === "5763", "ticket passthrough — repeated tickets produce independent movements");
  assert(movement.total === 50, "total = price - discount + surcharge");
  assert(movement.date.getTime() === sale.saleDate!.getTime(), "uses sale.saleDate when present");
  assert(movement.isCancelled === false, "isCancelled passthrough");
}

{
  const sale: DomainSale = {
    ticket: "5900", saleDate: null, memberNumber: "FN435", memberName: "JUAN",
    description: "AGUA 1L", paymentMethod: "CASH", sellerName: null,
    price: 20, discount: 5, surcharge: 2, isCancelled: true, isMembership: false,
  };
  const fallback = new Date("2026-01-13T00:00:00.000Z");
  const movement = buildSaleMovementData(sale, fallback);
  assert(movement.total === 17, "total = 20 - 5 + 2 = 17");
  assert(movement.date.getTime() === fallback.getTime(), "falls back to shift openingDate when saleDate null");
  assert(movement.isCancelled === true, "isCancelled true for Canceladas rows");
}

// ── buildInventoryAdjustmentMovements ─────────────────────────────────────────
console.log("\nbuildInventoryAdjustmentMovements");
{
  const date = new Date("2026-01-07T00:00:00.000Z");
  const noOp: DomainInventoryRow = { productName: "AGUA 1L", gymStock: 10, warehouseStock: 0, adjustment: 0, entries: 0 };
  assert(buildInventoryAdjustmentMovements(noOp, date).length === 0, "no movements when adjustment=0 and entries=0");

  const withAdjustment: DomainInventoryRow = { productName: "AGUA 1L", gymStock: 10, warehouseStock: 0, adjustment: -2, entries: 0 };
  const adjMovements = buildInventoryAdjustmentMovements(withAdjustment, date);
  assert(adjMovements.length === 1, "one movement when only adjustment != 0");
  assert(adjMovements[0].type === "ADJUSTMENT", "type = ADJUSTMENT");
  assert(adjMovements[0].quantity === -2, "quantity preserves sign");

  const withBoth: DomainInventoryRow = { productName: "AGUA 1L", gymStock: 10, warehouseStock: 0, adjustment: 3, entries: 12 };
  const bothMovements = buildInventoryAdjustmentMovements(withBoth, date);
  assert(bothMovements.length === 2, "two movements when both adjustment and entries != 0");
  assert(bothMovements.some((m) => m.type === "GYM_ENTRY" && m.quantity === 12), "GYM_ENTRY movement for entries");
}

// ── buildWithdrawalData ────────────────────────────────────────────────────────
console.log("\nbuildWithdrawalData");
{
  const fallback = new Date("2026-01-07T00:00:00.000Z");
  const zero: DomainWithdrawal = { withdrawalDate: null, concept: "-", amount: 0 };
  assert(buildWithdrawalData(zero, fallback) === null, "amount=0 → null (no withdrawal record)");

  const real: DomainWithdrawal = { withdrawalDate: new Date("2026-01-07T18:00:00.000Z"), concept: "Pago proveedor", amount: 500 };
  const data = buildWithdrawalData(real, fallback);
  assert(data !== null && data.amount === 500, "amount passthrough");
  assert(data !== null && data.createdAt.getTime() === real.withdrawalDate!.getTime(), "uses withdrawalDate when present");

  const noDate: DomainWithdrawal = { withdrawalDate: null, concept: "Retiro", amount: 100 };
  const data2 = buildWithdrawalData(noDate, fallback);
  assert(data2 !== null && data2.createdAt.getTime() === fallback.getTime(), "falls back to shift openingDate when withdrawalDate null");
}

console.log(`\n──────────────────────────────────────────`);
console.log(`shift-sync smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
