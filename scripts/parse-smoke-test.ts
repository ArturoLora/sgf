/**
 * Parser Smoke Tests — Story 1.2
 *
 * Pure unit tests: no DB, no HTTP, no file I/O.
 * Tests all domain parsers with real-world values from historical Excel data.
 *
 * Usage: npx tsx scripts/parse-smoke-test.ts
 */

import { parseMembership } from "../modules/migration/domain/parsers/membership-parser";
import { parseFormaPago } from "../modules/migration/domain/parsers/payment-parser";
import { normalizeDate } from "../modules/migration/domain/parsers/date-parser";
import { normalizePhone, normalizeEmail } from "../modules/migration/domain/parsers/null-normalizer";

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

function expectNotNull<T>(label: string, got: T | null) {
  if (got !== null && got !== undefined) pass(label);
  else fail(label, "expected non-null");
}

function expectNull(label: string, got: unknown) {
  if (got === null || got === undefined) pass(label);
  else fail(label, `expected null, got ${JSON.stringify(got)}`);
}

function expectWarning(label: string, warning: { code?: string } | null, code: string) {
  if (warning?.code === code) pass(label);
  else fail(label, `expected warning code "${code}", got ${JSON.stringify(warning)}`);
}

function expectNoWarning(label: string, warning: unknown) {
  if (warning === null || warning === undefined) pass(label);
  else fail(label, `expected no warning, got ${JSON.stringify(warning)}`);
}

// ─── Membership parser ───────────────────────────────────────────────────────

console.log("\n── parseMembership ──");

{
  const r = parseMembership("MENSUALIDAD");
  expect("MENSUALIDAD → MONTH_GENERAL", r.membershipType, "MONTH_GENERAL");
  expectNoWarning("MENSUALIDAD no warning", r.warning);
}

{
  const r = parseMembership("EFECTIVO MENSUALIDAD ENERO 2024");
  expect("prefix EFECTIVO stripped", r.paymentPrefix, "CASH");
  expect("MENSUALIDAD with month", r.membershipType, "MONTH_GENERAL");
  expect("month parsed", r.month, 1);
  expect("year parsed", r.year, 2024);
}

{
  const r = parseMembership("TARJETA MENSUALIDAD ESTUDIANTE MARZO 2023");
  expect("MENSUALIDAD ESTUDIANTE → MONTH_STUDENT", r.membershipType, "MONTH_STUDENT");
  expect("TARJETA → DEBIT_CARD", r.paymentPrefix, "DEBIT_CARD");
  expect("month=3", r.month, 3);
}

{
  const r = parseMembership("MENSUALIDAD LEO FEBRERO 2024");
  expect("MENSUALIDAD LEO → MONTH_GENERAL", r.membershipType, "MONTH_GENERAL");
  expect("trainer=LEO", r.trainerName, "LEO");
  expect("month=2", r.month, 2);
}

{
  const r = parseMembership("PRMOCION"); // deliberate typo from historical data
  expect("PRMOCION typo → PROMOTION", r.membershipType, "PROMOTION");
  expectNoWarning("PRMOCION no warning", r.warning);
}

{
  const r = parseMembership("PROMOCIÓN"); // with diacritic
  expect("PROMOCIÓN (diacritic) → PROMOTION", r.membershipType, "PROMOTION");
}

{
  const r = parseMembership("VISITA");
  expect("VISITA → VISIT", r.membershipType, "VISIT");
}

{
  const r = parseMembership("PPE");
  expect("PPE → MONTH_STUDENT", r.membershipType, "MONTH_STUDENT");
}

{
  const r = parseMembership("PPG");
  expect("PPG → MONTH_GENERAL", r.membershipType, "MONTH_GENERAL");
}

{
  const r = parseMembership("RE NACER");
  expect("RE NACER → REBIRTH", r.membershipType, "REBIRTH");
}

{
  const r = parseMembership("PACIENTES NACHO");
  expect("PACIENTES NACHO → NUTRITION_CONSULTATION", r.membershipType, "NUTRITION_CONSULTATION");
}

{
  const r = parseMembership("LEO"); // standalone trainer reference
  expect("standalone LEO → MONTH_GENERAL", r.membershipType, "MONTH_GENERAL");
}

{
  const r = parseMembership("ALGO COMPLETAMENTE DESCONOCIDO XYZ 123");
  expectNull("unknown → membershipType null", r.membershipType);
  expectWarning("unknown produces UNKNOWN_MEMBERSHIP", r.warning, "UNKNOWN_MEMBERSHIP");
  expect("rawInput preserved", r.rawInput, "ALGO COMPLETAMENTE DESCONOCIDO XYZ 123");
}

{
  const r = parseMembership("");
  expectNull("empty string → null", r.membershipType);
}

// ─── Payment parser ──────────────────────────────────────────────────────────

console.log("\n── parseFormaPago ──");

{
  const r = parseFormaPago("EFECTIVO (JUAN)");
  expect("EFECTIVO → CASH", r.paymentMethod, "CASH");
  expect("seller extracted", r.sellerName, "JUAN");
  expectNoWarning("EFECTIVO no warning", r.warning);
}

{
  const r = parseFormaPago("TARJETA DEBITO (MARIA)");
  expect("TARJETA DEBITO → DEBIT_CARD", r.paymentMethod, "DEBIT_CARD");
  expect("seller from TARJETA DEBITO", r.sellerName, "MARIA");
}

{
  const r = parseFormaPago("TARJETA CREDITO");
  expect("TARJETA CREDITO → CREDIT_CARD", r.paymentMethod, "CREDIT_CARD");
  expectNull("no seller", r.sellerName);
}

{
  const r = parseFormaPago("TARJETA"); // ambiguous — defaults to DEBIT
  expect("TARJETA alone → DEBIT_CARD", r.paymentMethod, "DEBIT_CARD");
}

{
  const r = parseFormaPago("TRANSFERENCIA (BOT)");
  expect("TRANSFERENCIA → TRANSFER", r.paymentMethod, "TRANSFER");
  expect("bot seller", r.sellerName, "BOT");
}

{
  const r = parseFormaPago("VOUCHER");
  expect("VOUCHER → DEBIT_CARD", r.paymentMethod, "DEBIT_CARD");
}

{
  const r = parseFormaPago("METODO RARO");
  expectNull("unknown → null", r.paymentMethod);
  expectWarning("unknown produces UNKNOWN_PAYMENT_METHOD", r.warning, "UNKNOWN_PAYMENT_METHOD");
}

// ─── Date parser ─────────────────────────────────────────────────────────────

console.log("\n── normalizeDate ──");

{
  const r = normalizeDate(new Date("2024-01-15T00:00:00.000Z"));
  expectNotNull("Date passthrough", r.date);
  expectNoWarning("Date no warning", r.warning);
}

{
  // Excel serial for 2024-01-15: days since 1899-12-30 = 45306 (approximately)
  const r = normalizeDate(45306);
  expectNotNull("numeric serial → date", r.date);
  expect("numeric recognized", r.recognized, true);
}

{
  const r = normalizeDate("2024-03-10T00:00:00.000Z");
  expectNotNull("ISO string → date", r.date);
  expect("ISO recognized", r.recognized, true);
}

{
  const r = normalizeDate("lunes 15-ene-2024");
  expectNotNull("Spanish date string", r.date);
  expect("Spanish recognized", r.recognized, true);
}

{
  const r = normalizeDate("15-mar-2023 14:30");
  expectNotNull("Spanish datetime without prefix", r.date);
}

{
  const r = normalizeDate(null);
  expectNull("null → null date", r.date);
  expectNoWarning("null no warning", r.warning);
}

{
  const r = normalizeDate("");
  expectNull("empty → null date", r.date);
}

{
  const r = normalizeDate("not a date at all $$$$");
  expect("unrecognized → not recognized", r.recognized, false);
  expectWarning("unrecognized date → warning", r.warning, "UNRECOGNIZED_DATE_FORMAT");
}

// ─── Null normalizers ────────────────────────────────────────────────────────

console.log("\n── normalizePhone ──");

expect("valid phone kept", normalizePhone("555-1234"), "555-1234");
expectNull("empty → null", normalizePhone(""));
expectNull("'na' → null", normalizePhone("na"));
expectNull("'N/A' → null", normalizePhone("N/A"));
expectNull("'0' → null", normalizePhone("0"));
expectNull("'000' → null", normalizePhone("000"));
expectNull("'ninguno' → null", normalizePhone("ninguno"));
expectNull("'sin numero' → null", normalizePhone("sin numero"));
expectNull("null passthrough", normalizePhone(null));

console.log("\n── normalizeEmail ──");

expect("valid email kept", normalizeEmail("user@example.com"), "user@example.com");
expectNull("no @ → null", normalizeEmail("notanemail"));
expectNull("empty → null", normalizeEmail(""));
expectNull("null passthrough", normalizeEmail(null));

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(48)}`);
console.log(`  Total: ${passed + failed}  |  ✅ ${passed}  |  ❌ ${failed}`);
if (failures.length > 0) {
  console.error("\nFailures:");
  failures.forEach((f) => console.error(`  • ${f}`));
  process.exit(1);
} else {
  console.log("  All parser smoke tests passed.\n");
}
