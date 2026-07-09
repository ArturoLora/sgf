/**
 * Migration Batching Smoke Tests — Story de batching de transporte HTTP
 *
 * Pure unit tests: no DB, no HTTP, no file I/O.
 *
 * Usage: npx tsx scripts/migracion-batching-smoke-test.ts
 */

import {
  partitionByByteBudget,
  concatAnalysisResults,
  consolidatePreviewBatches,
  detectDuplicateFolios,
  rehydrateShiftDates,
  rehydrateMemberDates,
  validateStagingCompleteness,
} from "../modules/migration/domain/upload-batching";
import type {
  AnalysisResultType,
  MemberPreviewType,
  PreviewResponseType,
  ShiftDetailType,
} from "../types/api/migracion";

// ─── Reporter ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function pass(label: string) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label: string, detail: string) {
  console.error(`  ❌ ${label}: ${detail}`);
  failures.push(`${label}: ${detail}`);
  failed++;
}

function expect<T>(label: string, got: T, expected: T) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) pass(label);
  else fail(label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

function expectTrue(label: string, condition: boolean, detail = "expected true") {
  if (condition) pass(label);
  else fail(label, detail);
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeShift(folio: string): ShiftDetailType {
  return {
    folio,
    openingDate: "2026-01-01T07:00:00.000Z",
    openingTime: "09:00",
    closingTime: "18:00",
    saleCount: 1,
    cancelledCount: 0,
    membershipSaleCount: 0,
    inventoryCount: 0,
    withdrawalCount: 0,
    legacyNotes: null,
    cashierName: "CAJERO",
    sales: [],
    inventory: [],
    withdrawals: [],
    initialCash: 0,
    ticketCount: 0,
    membershipSales: 0,
    productSales0Tax: 0,
    productSales16Tax: 0,
    subtotal: 0,
    tax: 0,
    totalSales: 0,
    cashAmount: 0,
    debitCardAmount: 0,
    creditCardAmount: 0,
    totalVoucher: 0,
    totalWithdrawalsAmount: 0,
    totalCash: 0,
  };
}

function makePreview(shifts: ShiftDetailType[], sellerNames: string[], distribution: Record<string, number>): PreviewResponseType {
  return {
    members: [],
    shifts,
    warnings: [],
    membershipTypeDistribution: distribution,
    totalWarnings: 0,
    sellerNames,
  };
}

// ─── partitionByByteBudget ─────────────────────────────────────────────────────

console.log("\n── partitionByByteBudget ──");

{
  const files = [{ size: 100 }, { size: 100 }, { size: 100 }];
  const batches = partitionByByteBudget(files, (f) => f.size, { maxBytes: 250, maxFiles: 80 });
  expect("lote parejo por bytes", batches, [[0, 1], [2]]);
}

{
  const files = [{ size: 10 }, { size: 1000 }, { size: 10 }];
  const batches = partitionByByteBudget(files, (f) => f.size, { maxBytes: 100, maxFiles: 80 });
  expectTrue(
    "archivo que excede el presupuesto viaja solo",
    batches.length === 3 && batches[1].length === 1 && batches[1][0] === 1,
    `got ${JSON.stringify(batches)}`,
  );
}

{
  const files = [{ size: 10 }];
  const batches = partitionByByteBudget(files, (f) => f.size);
  expect("un solo archivo → un solo batch", batches, [[0]]);
}

{
  const files: { size: number }[] = [];
  const batches = partitionByByteBudget(files, (f) => f.size);
  expect("lote vacío → sin batches", batches, []);
}

{
  const files = [{ size: 10 }, { size: 10 }, { size: 10 }];
  const batches = partitionByByteBudget(files, (f) => f.size, { maxBytes: 1_000_000, maxFiles: 2 });
  expect("tope secundario por cantidad", batches, [[0, 1], [2]]);
}

{
  const files = [{ size: 10 }, { size: 10 }, { size: 10 }, { size: 10 }];
  const batches = partitionByByteBudget(files, (f) => f.size, { maxBytes: 15, maxFiles: 80 });
  const order = batches.flat();
  expect("orden determinista preservado", order, [0, 1, 2, 3]);
}

// ─── concatAnalysisResults ─────────────────────────────────────────────────────

console.log("\n── concatAnalysisResults ──");

{
  const batchA: AnalysisResultType[] = [{ filename: "a.xlsx", fileType: "cortes", validationStatus: "valid", recordCount: 1 }];
  const batchB: AnalysisResultType[] = [{ filename: "b.xlsx", fileType: "socios", validationStatus: "valid", recordCount: 2 }];
  const result = concatAnalysisResults([batchA, batchB]);
  expect("preserva orden de batches y archivos", result.map((r) => r.filename), ["a.xlsx", "b.xlsx"]);
}

// ─── detectDuplicateFolios ─────────────────────────────────────────────────────

console.log("\n── detectDuplicateFolios ──");

{
  const warnings = detectDuplicateFolios([{ folio: "1" }, { folio: "2" }, { folio: "3" }]);
  expect("0 duplicados", warnings.length, 0);
}

{
  const warnings = detectDuplicateFolios([{ folio: "1" }, { folio: "1" }, { folio: "2" }]);
  expectTrue(
    "1 folio repetido 2 veces",
    warnings.length === 1 && warnings[0].code === "DUPLICATE_FOLIO" && warnings[0].originalValue === "1",
    `got ${JSON.stringify(warnings)}`,
  );
}

{
  const warnings = detectDuplicateFolios([{ folio: "9" }, { folio: "9" }, { folio: "9" }]);
  expectTrue(
    "folio repetido 3 veces sigue siendo 1 warning con el conteo correcto",
    warnings.length === 1 && warnings[0].message.includes("3 veces"),
    `got ${JSON.stringify(warnings)}`,
  );
}

// ─── consolidatePreviewBatches ─────────────────────────────────────────────────

console.log("\n── consolidatePreviewBatches ──");

{
  const batchA = makePreview([makeShift("F1")], ["ANA", "LUIS"], { MONTH_GENERAL: 2 });
  const batchB = makePreview([makeShift("F2")], ["LUIS", "PEDRO"], { MONTH_GENERAL: 1, VISIT: 5 });
  const merged = consolidatePreviewBatches([batchA, batchB]);

  expect("membershipTypeDistribution suma por clave", merged.membershipTypeDistribution, {
    MONTH_GENERAL: 3,
    VISIT: 5,
  });
  expect("sellerNames unión+dedup+sort global", merged.sellerNames, ["ANA", "LUIS", "PEDRO"]);
  expect("shifts concatenados en orden", merged.shifts.map((s) => s.folio), ["F1", "F2"]);
}

{
  const batchA = makePreview([makeShift("DUP")], [], {});
  const batchB = makePreview([makeShift("DUP")], [], {});
  const merged = consolidatePreviewBatches([batchA, batchB]);
  expectTrue(
    "detecta folio duplicado entre batches distintos (cross-batch)",
    merged.warnings.some((w) => w.code === "DUPLICATE_FOLIO" && w.originalValue === "DUP"),
    `got ${JSON.stringify(merged.warnings)}`,
  );
  expect("totalWarnings recalculado tras agregar duplicados", merged.totalWarnings, merged.warnings.length);
}

// ─── rehidratación de Date ──────────────────────────────────────────────────────

console.log("\n── rehydrateShiftDates / rehydrateMemberDates ──");

{
  const raw = makeShift("F1");
  raw.sales.push({
    ticket: "1",
    saleDate: "2026-02-01T10:00:00.000Z",
    memberNumber: null,
    memberName: null,
    description: "Producto",
    paymentMethod: "CASH",
    sellerName: "ANA",
    price: 100,
    discount: 0,
    surcharge: 0,
    isCancelled: false,
    isMembership: false,
  });
  raw.withdrawals.push({ withdrawalDate: "2026-02-01T12:00:00.000Z", concept: "Retiro", amount: 50 });

  const shift = rehydrateShiftDates(raw);
  expectTrue("openingDate rehidratado a Date", shift.openingDate instanceof Date);
  expectTrue("sale.saleDate rehidratado a Date", shift.sales[0].saleDate instanceof Date);
  expectTrue("withdrawal.withdrawalDate rehidratado a Date", shift.withdrawals[0].withdrawalDate instanceof Date);
}

{
  const raw = makeShift("F2");
  const shift = rehydrateShiftDates(raw);
  expectTrue("openingDate null-safe", shift.openingDate instanceof Date, "no debería fallar con fecha presente");

  raw.openingDate = null;
  const shiftNull = rehydrateShiftDates(raw);
  expect("openingDate null se preserva como null", shiftNull.openingDate, null);
}

{
  const raw: MemberPreviewType = {
    memberNumber: "1",
    name: "Socio",
    phone: null,
    email: null,
    birthDate: "1990-01-01T00:00:00.000Z",
    startDate: null,
    endDate: null,
    membershipType: null,
    membershipDescription: null,
    paymentMethodFromMembership: null,
    totalVisits: 0,
    lastVisit: null,
    isActive: true,
  };
  const member = rehydrateMemberDates(raw);
  expectTrue("birthDate rehidratado a Date", member.birthDate instanceof Date);
  expect("startDate null se preserva como null", member.startDate, null);
}

// ─── validateStagingCompleteness ───────────────────────────────────────────────

console.log("\n── validateStagingCompleteness ──");

{
  const rows = [
    { batchIndex: 0, totalBatches: 3 },
    { batchIndex: 1, totalBatches: 3 },
    { batchIndex: 2, totalBatches: 3 },
  ];
  expectTrue("completo (0,1,2 de 3) → ok", validateStagingCompleteness(rows).ok === true);
}

{
  // CRÍTICO: batches 0,1,3 de 4 — falta el 2 — NUNCA debe pasar.
  const rows = [
    { batchIndex: 0, totalBatches: 4 },
    { batchIndex: 1, totalBatches: 4 },
    { batchIndex: 3, totalBatches: 4 },
  ];
  const result = validateStagingCompleteness(rows);
  expectTrue("batch faltante (0,1,3 de 4) → rechazado", result.ok === false, `got ${JSON.stringify(result)}`);
}

{
  const rows = [{ batchIndex: 0, totalBatches: 2 }];
  const result = validateStagingCompleteness(rows);
  expectTrue("recibidos < totalBatches → rechazado", result.ok === false, `got ${JSON.stringify(result)}`);
}

{
  const rows = [
    { batchIndex: 0, totalBatches: 2 },
    { batchIndex: 5, totalBatches: 2 },
  ];
  const result = validateStagingCompleteness(rows);
  expectTrue("batchIndex fuera de rango → rechazado", result.ok === false, `got ${JSON.stringify(result)}`);
}

{
  const rows = [
    { batchIndex: 0, totalBatches: 2 },
    { batchIndex: 1, totalBatches: 3 },
  ];
  const result = validateStagingCompleteness(rows);
  expectTrue("totalBatches inconsistente entre filas → rechazado", result.ok === false, `got ${JSON.stringify(result)}`);
}

{
  const result = validateStagingCompleteness([]);
  expectTrue("sin filas → rechazado", result.ok === false);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(48)}`);
console.log(`  Total: ${passed + failed}  |  ✅ ${passed}  |  ❌ ${failed}`);
if (failures.length > 0) {
  console.error("\nFailures:");
  failures.forEach((f) => console.error(`  • ${f}`));
  process.exit(1);
} else {
  console.log("  All migration batching smoke tests passed.\n");
}
