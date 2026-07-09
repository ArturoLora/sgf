// Ciclo de vida de empleados en Reconstruction — funciones puras.
// Sin Prisma, sin Better Auth, sin HTTP (P-3).

export interface UserForDeletionCheck {
  id: string;
  role: "ADMIN" | "EMPLEADO";
}

export interface UsersToDeleteValidation {
  valid: boolean;
  invalidIds: string[];
  reason: string | null;
}

// candidatos = Users no-ADMIN menos Set(Object.values(employeeMapping)).
// Nunca confía en isActive — un EMPLEADO activo puede ser candidato.
export function computeDeletionCandidateIds(
  allNonAdminUserIds: string[],
  employeeMapping: Record<string, string>,
): string[] {
  const mappingTargets = new Set(Object.values(employeeMapping));
  return allNonAdminUserIds.filter((id) => !mappingTargets.has(id));
}

// Guardia server-side única (executeReconstruction es la single source of
// truth): rechaza el conjunto COMPLETO si CUALQUIER id falla cualquiera de
// las 4 reglas — nunca hay eliminación parcial por validación individual.
// `existingUsers` debe contener solo los ids que SÍ existen en DB — un id de
// `usersToDelete` ausente de `existingUsers` se trata como "no existe".
export function validateUsersToDelete(
  usersToDelete: string[],
  existingUsers: UserForDeletionCheck[],
  employeeMapping: Record<string, string>,
  authenticatedAdminId: string,
): UsersToDeleteValidation {
  const existingById = new Map(existingUsers.map((u) => [u.id, u]));
  const mappingTargets = new Set(Object.values(employeeMapping));

  const invalidIds: string[] = [];
  const reasons: string[] = [];

  for (const id of usersToDelete) {
    const user = existingById.get(id);
    if (!user) {
      invalidIds.push(id);
      reasons.push(`${id}: no existe`);
    } else if (user.role === "ADMIN") {
      invalidIds.push(id);
      reasons.push(`${id}: es ADMIN, no puede eliminarse desde este flujo`);
    } else if (id === authenticatedAdminId) {
      invalidIds.push(id);
      reasons.push(`${id}: corresponde al ADMIN autenticado`);
    } else if (mappingTargets.has(id)) {
      invalidIds.push(id);
      reasons.push(`${id}: es destino del mapeo de empleados final`);
    }
  }

  return {
    valid: invalidIds.length === 0,
    invalidIds,
    reason: reasons.length > 0 ? reasons.join("; ") : null,
  };
}
