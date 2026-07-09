import {
  computeDeletionCandidateIds,
  validateUsersToDelete,
} from "../modules/migration/domain/employee-lifecycle";

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

console.log("\ncomputeDeletionCandidateIds");
{
  const result = computeDeletionCandidateIds(
    ["alicia", "angelica", "gael", "andrew"],
    { "ALICIA ACEVEDO": "alicia", GAEL: "gael" },
  );
  assert(
    result.includes("angelica") && result.includes("andrew") && result.length === 2,
    "no destino del mapping → candidato (#1)",
  );
}

{
  const result = computeDeletionCandidateIds(["activeUnused"], {});
  assert(result.includes("activeUnused"), "EMPLEADO activo no usado igual aparece como candidato — sin filtro isActive (#2)");
}

{
  const result = computeDeletionCandidateIds(
    ["alicia"],
    { "ALICIA ACEVEDO": "alicia", ANGELICA: "alicia" },
  );
  assert(!result.includes("alicia"), "User destino de 2 claves del mapping (alias convergente) nunca es candidato (#3)");
}

// Nota sobre AC "ADMIN nunca es candidato": el filtro por rol ocurre en la
// query de Prisma dentro de getDeletionCandidates() (where: {role: {not:
// "ADMIN"}}), ANTES de invocar esta función pura — computeDeletionCandidateIds
// recibe `allNonAdminUserIds` ya filtrado por contrato, no reimplementa ese
// filtro (no hay Prisma en esta capa). Sin caso de prueba aquí porque no hay
// nada que este nivel deba rechazar por sí solo.

console.log("\nvalidateUsersToDelete");
{
  const result = validateUsersToDelete(
    ["missing"],
    [],
    {},
    "admin-1",
  );
  assert(!result.valid && result.invalidIds.includes("missing"), "id inexistente → inválido (#5)");
}

{
  const result = validateUsersToDelete(
    ["admin-2"],
    [{ id: "admin-2", role: "ADMIN" }],
    {},
    "admin-1",
  );
  assert(!result.valid && result.invalidIds.includes("admin-2"), "role=ADMIN → inválido (#6)");
}

{
  const result = validateUsersToDelete(
    ["admin-1"],
    [{ id: "admin-1", role: "ADMIN" }],
    {},
    "admin-1",
  );
  assert(!result.valid && result.invalidIds.includes("admin-1"), "id === authenticatedAdminId → inválido (#7)");
}

{
  const result = validateUsersToDelete(
    ["alicia"],
    [{ id: "alicia", role: "EMPLEADO" }],
    { "ALICIA ACEVEDO": "alicia" },
    "admin-1",
  );
  assert(!result.valid && result.invalidIds.includes("alicia"), "destino del employeeMapping final → inválido (#8)");
}

{
  const result = validateUsersToDelete(
    ["angelica", "empleado-activo"],
    [
      { id: "angelica", role: "EMPLEADO" },
      { id: "empleado-activo", role: "EMPLEADO" },
    ],
    { "ALICIA ACEVEDO": "alicia" },
    "admin-1",
  );
  assert(result.valid && result.invalidIds.length === 0, "mezcla de ids válidos, ninguno viola las 4 reglas → válido (#9)");
}

{
  const result = validateUsersToDelete(
    ["valido", "missing"],
    [{ id: "valido", role: "EMPLEADO" }],
    {},
    "admin-1",
  );
  assert(!result.valid && result.invalidIds.length === 1 && result.invalidIds[0] === "missing", "1 válido + 1 inválido → conjunto completo rechazado, sin eliminación parcial (#10)");
}

{
  const result = validateUsersToDelete([], [], {}, "admin-1");
  assert(result.valid, "usersToDelete=[] es trivialmente válido — no bloquea Reconstruction (#11)");
}

console.log("\nCaso Alicia/Angélica (#12)");
{
  const mapping = { "ALICIA ACEVEDO": "alicia-id", ANGELICA: "alicia-id" };
  const candidates = computeDeletionCandidateIds(["alicia-id", "angelica-id"], mapping);
  assert(!candidates.includes("alicia-id") && candidates.includes("angelica-id"), "Alicia (usada por 2 claves) no es candidata; Angélica (User separado, no usado) sí");

  const validation = validateUsersToDelete(
    ["angelica-id"],
    [{ id: "angelica-id", role: "EMPLEADO" }],
    mapping,
    "admin-1",
  );
  assert(validation.valid, "angelica-id pasa las 4 guardias — elegible para eliminación real");
}

console.log(`\n──────────────────────────────────────────`);
console.log(`employee-lifecycle smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
