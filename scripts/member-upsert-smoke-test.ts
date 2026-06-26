import { buildMemberUpsertData } from "../modules/migration/domain/member-upsert";
import type { DomainMember } from "../modules/migration/domain/domain.types";

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

function makeMember(overrides: Partial<DomainMember> = {}): DomainMember {
  return {
    memberNumber: "FN001",
    name: "Juan Pérez",
    phone: "5551234567",
    email: "juan@example.com",
    birthDate: new Date("1990-01-15"),
    startDate: new Date("2024-01-01"),
    endDate: new Date("2025-01-01"),
    membershipType: "ANNUAL_STUDENT",
    membershipDescription: "EFECTIVO ANUALIDAD ESTUDIANTE ENE 2026",
    paymentMethodFromMembership: "CASH",
    totalVisits: 42,
    lastVisit: new Date("2024-12-01"),
    isActive: true,
    ...overrides,
  };
}

// ── Case 1: all normal fields map correctly ──────────────────────────────────
console.log("\nCase 1: normal fields");
{
  const member = makeMember();
  const result = buildMemberUpsertData(member);
  assert(result.memberNumber === "FN001", "memberNumber");
  assert(result.name === "Juan Pérez", "name");
  assert(result.phone === "5551234567", "phone");
  assert(result.email === "juan@example.com", "email");
  assert(result.birthDate?.toISOString() === member.birthDate?.toISOString(), "birthDate");
  assert(result.startDate?.toISOString() === member.startDate?.toISOString(), "startDate");
  assert(result.endDate?.toISOString() === member.endDate?.toISOString(), "endDate");
  assert(result.membershipType === "ANNUAL_STUDENT", "membershipType");
  assert(result.membershipDescription === "EFECTIVO ANUALIDAD ESTUDIANTE ENE 2026", "membershipDescription");
  assert(result.totalVisits === 42, "totalVisits");
  assert(result.lastVisit?.toISOString() === member.lastVisit?.toISOString(), "lastVisit");
  assert(result.isActive === true, "isActive");
}

// ── Case 2: paymentMethodFromMembership not in output ────────────────────────
console.log("\nCase 2: paymentMethodFromMembership excluded");
{
  const result = buildMemberUpsertData(makeMember({ paymentMethodFromMembership: "CASH" }));
  assert(!("paymentMethodFromMembership" in result), "paymentMethodFromMembership absent from output");
}

// ── Case 3: name empty string → null ────────────────────────────────────────
console.log("\nCase 3: name = '' → null");
{
  const result = buildMemberUpsertData(makeMember({ name: "" }));
  assert(result.name === null, "empty name → null");
}

// ── Case 4: phone already null (normalized by transformer) ──────────────────
console.log("\nCase 4: phone = null passthrough");
{
  const result = buildMemberUpsertData(makeMember({ phone: null }));
  assert(result.phone === null, "null phone preserved");
}

// ── Case 5: email null passthrough ──────────────────────────────────────────
console.log("\nCase 5: email = null passthrough");
{
  const result = buildMemberUpsertData(makeMember({ email: null }));
  assert(result.email === null, "null email preserved");
}

// ── Case 6: membershipType = null ────────────────────────────────────────────
console.log("\nCase 6: membershipType = null");
{
  const result = buildMemberUpsertData(makeMember({ membershipType: null }));
  assert(result.membershipType === null, "null membershipType preserved");
}

// ── Case 7: membershipType recognized value preserved as string ───────────────
console.log("\nCase 7: membershipType = 'ANNUAL_STUDENT' preserved as string");
{
  const result = buildMemberUpsertData(makeMember({ membershipType: "ANNUAL_STUDENT" }));
  assert(result.membershipType === "ANNUAL_STUDENT", "ANNUAL_STUDENT preserved");
}

// ── Case 8: all dates null ────────────────────────────────────────────────────
console.log("\nCase 8: all dates null");
{
  const result = buildMemberUpsertData(
    makeMember({ birthDate: null, startDate: null, endDate: null, lastVisit: null }),
  );
  assert(result.birthDate === null, "birthDate null");
  assert(result.startDate === null, "startDate null");
  assert(result.endDate === null, "endDate null");
  assert(result.lastVisit === null, "lastVisit null");
}

// ── Case 9: totalVisits = 0 ───────────────────────────────────────────────────
console.log("\nCase 9: totalVisits = 0");
{
  const result = buildMemberUpsertData(makeMember({ totalVisits: 0 }));
  assert(result.totalVisits === 0, "totalVisits 0 preserved");
}

// ── Case 10: isActive = false ─────────────────────────────────────────────────
console.log("\nCase 10: isActive = false");
{
  const result = buildMemberUpsertData(makeMember({ isActive: false }));
  assert(result.isActive === false, "isActive false preserved");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────────`);
console.log(`member-upsert smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
