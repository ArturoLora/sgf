// Smoke tests for classifyInconsistencies() — pure, no DB, no HTTP.
import { classifyInconsistencies } from "../modules/migration/domain/inconsistency-classifier";
import type { UserRef, ParseWarning } from "../modules/migration/domain/domain.types";

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean): void {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    failed++;
  }
}

const users: UserRef[] = [
  { id: "u1", name: "Andrew", email: "andrew@gym.mx", role: "EMPLEADO", isActive: true },
  { id: "u2", name: "Carlos", email: "carlos@gym.mx", role: "EMPLEADO", isActive: true },
  { id: "u3", name: "María", email: "maria@gym.mx", role: "EMPLEADO", isActive: true },
];

const warnings: ParseWarning[] = [
  { filename: "socios.xlsx", row: 5, field: "Membresia", originalValue: "CROSSFIT", message: "Tipo no reconocido", code: "UNKNOWN_MEMBERSHIP" },
  { filename: "socios.xlsx", row: 8, field: "Membresia", originalValue: "PILATES", message: "Tipo no reconocido", code: "UNKNOWN_MEMBERSHIP" },
  { filename: "corte1.xlsx", row: 12, field: "Forma Pago", originalValue: "CRIPTOMONEDA", message: "Método no reconocido", code: "UNKNOWN_PAYMENT_METHOD" },
  { filename: "corte1.xlsx", row: 3, field: "Fecha Venta", originalValue: "32/13/2024", message: "Fecha no reconocida", code: "UNRECOGNIZED_DATE_FORMAT" },
  { filename: "corte1.xlsx", row: 7, field: "Misc", originalValue: "?", message: "Valor desconocido", code: "OTHER_CODE" },
];

console.log("\n── classifyInconsistencies smoke tests ──\n");

// ── Case 1: empty sellerNames ─────────────────────────────────────────────────
console.log("Case 1: empty sellerNames → canProceed = true");
{
  const report = classifyInconsistencies([], [], []);
  assert("canProceed = true", report.canProceed === true);
  assert("totalBlocking = 0", report.totalBlocking === 0);
  assert("totalWarnings = 0", report.totalWarnings === 0);
  assert("employeeMappings = []", report.employeeMappings.length === 0);
}

// ── Case 2: exact case match ──────────────────────────────────────────────────
console.log("\nCase 2: exact case match → auto-mapped");
{
  const report = classifyInconsistencies(["Andrew"], [], users);
  assert("length = 1", report.employeeMappings.length === 1);
  assert("isAutoMapped = true", report.employeeMappings[0].isAutoMapped === true);
  assert("resolvedUserId = u1", report.employeeMappings[0].resolvedUserId === "u1");
  assert("canProceed = true", report.canProceed === true);
  assert("totalBlocking = 0", report.totalBlocking === 0);
}

// ── Case 3: different case → auto-mapped (case-insensitive) ──────────────────
console.log("\nCase 3: historical ANDREW vs user Andrew → auto-mapped (case-insensitive)");
{
  const report = classifyInconsistencies(["ANDREW"], [], users);
  assert("isAutoMapped = true", report.employeeMappings[0].isAutoMapped === true);
  assert("resolvedUserId = u1", report.employeeMappings[0].resolvedUserId === "u1");
  assert("canProceed = true", report.canProceed === true);
}

// ── Case 4: lowercase historical → auto-mapped ────────────────────────────────
console.log("\nCase 4: lowercase 'carlos' vs user 'Carlos' → auto-mapped");
{
  const report = classifyInconsistencies(["carlos"], [], users);
  assert("isAutoMapped = true", report.employeeMappings[0].isAutoMapped === true);
  assert("resolvedUserId = u2", report.employeeMappings[0].resolvedUserId === "u2");
}

// ── Case 5: no match → unresolved, blocks proceed ────────────────────────────
console.log("\nCase 5: no match → unresolved, totalBlocking = 1");
{
  const report = classifyInconsistencies(["ROBERTO"], [], users);
  assert("isAutoMapped = false", report.employeeMappings[0].isAutoMapped === false);
  assert("resolvedUserId = null", report.employeeMappings[0].resolvedUserId === null);
  assert("totalBlocking = 1", report.totalBlocking === 1);
  assert("canProceed = false", report.canProceed === false);
}

// ── Case 6: mixed — some matched, some not ───────────────────────────────────
console.log("\nCase 6: mixed — ANDREW matched, ROBERTO not → totalBlocking = 1");
{
  const report = classifyInconsistencies(["ANDREW", "ROBERTO"], [], users);
  assert("length = 2", report.employeeMappings.length === 2);
  assert("totalBlocking = 1", report.totalBlocking === 1);
  assert("canProceed = false", report.canProceed === false);
}

// ── Case 7: warnings grouped correctly ───────────────────────────────────────
console.log("\nCase 7: warnings grouped by code");
{
  const report = classifyInconsistencies([], warnings, []);
  assert("membershipWarnings.length = 2", report.membershipWarnings.length === 2);
  assert("paymentMethodWarnings.length = 1", report.paymentMethodWarnings.length === 1);
  assert("dateWarnings.length = 1", report.dateWarnings.length === 1);
  assert("otherWarnings.length = 1", report.otherWarnings.length === 1);
  assert("totalWarnings = 5", report.totalWarnings === 5);
  assert("canProceed = true (no blocking employees)", report.canProceed === true);
}

// ── Case 8: all mapped + warnings → canProceed = true ────────────────────────
console.log("\nCase 8: all mapped + warnings → canProceed = true");
{
  const report = classifyInconsistencies(["ANDREW", "Carlos"], warnings, users);
  assert("both auto-mapped", report.employeeMappings.every((e) => e.isAutoMapped));
  assert("totalBlocking = 0", report.totalBlocking === 0);
  assert("totalWarnings = 5", report.totalWarnings === 5);
  assert("canProceed = true", report.canProceed === true);
}

// ── Case 9: sellerName with leading/trailing spaces ───────────────────────────
console.log("\nCase 9: sellerName with leading/trailing spaces → still matches");
{
  const report = classifyInconsistencies(["  ANDREW  "], [], users);
  assert("isAutoMapped = true despite spaces", report.employeeMappings[0].isAutoMapped === true);
  assert("resolvedUserId = u1", report.employeeMappings[0].resolvedUserId === "u1");
}

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
