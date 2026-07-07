import { computeLastSalePrices } from "../modules/migration/domain/product-pricing";

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

console.log("\ncomputeLastSalePrices");
{
  const result = computeLastSalePrices([
    { productId: 1, unitPrice: 42, isCancelled: false, type: "SALE", date: new Date("2026-01-01"), id: 10 },
    { productId: 1, unitPrice: 45, isCancelled: false, type: "SALE", date: new Date("2026-03-01"), id: 55 },
  ]);
  assert(result.get(1) === 45, "conflict resolves to most recent SALE by date (AC-2)");
}

{
  const result = computeLastSalePrices([
    { productId: 2, unitPrice: 30, isCancelled: false, type: "SALE", date: new Date("2026-01-01"), id: 11 },
    { productId: 2, unitPrice: 0, isCancelled: false, type: "SALE", date: new Date("2026-02-01"), id: 12 },
  ]);
  assert(result.get(2) === 0, "most recent SALE with unitPrice=0 wins, no fallback to earlier non-zero (AC-4)");
}

{
  const result = computeLastSalePrices([
    { productId: 3, unitPrice: 99, isCancelled: false, type: "SALE", date: new Date("2026-01-01"), id: 13 },
    { productId: 3, unitPrice: 120, isCancelled: true, type: "SALE", date: new Date("2026-02-01"), id: 14 },
  ]);
  assert(result.get(3) === 99, "cancelled SALE ignored even when more recent (AC-5)");
}

{
  const result = computeLastSalePrices([
    { productId: 4, unitPrice: 50, isCancelled: false, type: "ADJUSTMENT", date: new Date("2026-01-01"), id: 15 },
  ]);
  assert(!result.has(4), "non-SALE type ignored completely (AC-6)");
}

{
  const result = computeLastSalePrices([]);
  assert(result.size === 0, "empty input produces empty Map — product keeps default salePrice=0 (AC-3)");
}

{
  const result = computeLastSalePrices([
    { productId: 6, unitPrice: 15, isCancelled: false, type: "SALE", date: new Date("2026-01-01"), id: 20 },
    { productId: 6, unitPrice: 22, isCancelled: false, type: "SALE", date: new Date("2026-01-01"), id: 21 },
  ]);
  assert(result.get(6) === 22, "identical date ties break by higher id, deterministically");
}

{
  const result = computeLastSalePrices([
    { productId: 7, unitPrice: 10, isCancelled: false, type: "SALE", date: new Date("2026-01-01"), id: 30 },
    { productId: 7, unitPrice: null, isCancelled: false, type: "SALE", date: new Date("2026-02-01"), id: 31 },
  ]);
  assert(result.get(7) === 10, "SALE with unitPrice=null ignored, earlier valid SALE wins");
}

console.log(`\n──────────────────────────────────────────`);
console.log(`product-pricing smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
