// Ciclo de vida de empleados en el wizard de Reconstruction — I/O (Prisma +
// Better Auth). Reutiliza UsersService.createEmployee()/setEmployeeActive()
// sin reimplementar esa lógica (P-2/P-8). Sigue el mismo patrón ya usado por
// resetEmployeePassword()/setEmployeeActive() para llamadas admin de Better
// Auth: headers() se obtiene dentro del Service, no se pasa desde la ruta.
import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UsersService } from "@/modules/users/users.service";
import {
  computeDeletionCandidateIds,
  type UserForDeletionCheck,
} from "./domain/employee-lifecycle";
import type { UserRefType, DeletionCandidateType } from "@/types/api/migracion";

function slugifyHistoricalName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "empleado";
}

// Convención NUEVA de este flujo, no la reutilización del patrón manual
// `.local` visto en DB (ver Dev Notes de la Story) — dominio no resoluble,
// imposible de confundir con un correo real.
function generateInternalEmail(historicalName: string): string {
  const slug = slugifyHistoricalName(historicalName);
  const suffix = randomBytes(4).toString("hex");
  return `migracion-historico+${slug}-${suffix}@sgf.internal`;
}

function generateTemporaryPassword(): string {
  return randomBytes(18).toString("base64url");
}

// Creación INMEDIATA (decisión cerrada) — role/isActive fijados server-side,
// nunca aceptados del cliente. La contraseña generada nunca se retorna, ni
// se loguea, ni se documenta.
export async function createHistoricalEmployee(
  historicalName: string,
): Promise<UserRefType> {
  const email = generateInternalEmail(historicalName);
  const password = generateTemporaryPassword();

  const created = await UsersService.createEmployee({
    name: historicalName,
    email,
    password,
    role: "EMPLEADO",
  });

  const { employee } = await UsersService.setEmployeeActive(created.id, false);

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    isActive: employee.isActive,
  };
}

// Server-side, siempre: candidatos = Users no-ADMIN menos destinos del
// mapping final. Nunca confía en isActive.
export async function getDeletionCandidates(
  employeeMapping: Record<string, string>,
): Promise<DeletionCandidateType[]> {
  const nonAdminUsers = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: { id: true, name: true, isActive: true },
  });

  const candidateIds = new Set(
    computeDeletionCandidateIds(
      nonAdminUsers.map((u) => u.id),
      employeeMapping,
    ),
  );
  const candidates = nonAdminUsers.filter((u) => candidateIds.has(u.id));

  return Promise.all(
    candidates.map(async (u) => {
      const [shiftsCount, movementsCount, withdrawalsCount] = await Promise.all([
        prisma.shift.count({ where: { cashierId: u.id } }),
        prisma.inventoryMovement.count({ where: { userId: u.id } }),
        prisma.cashWithdrawal.count({ where: { userId: u.id } }),
      ]);
      return {
        id: u.id,
        name: u.name,
        isActive: u.isActive,
        shiftsCount,
        movementsCount,
        withdrawalsCount,
      };
    }),
  );
}

// Usado por executeReconstruction() (single source of truth de las
// guardias) para cargar solo los Users que SÍ existen entre los ids
// solicitados — cualquier id ausente de este resultado se trata como
// "no existe" por validateUsersToDelete().
export async function fetchUsersForDeletionCheck(
  ids: string[],
): Promise<UserForDeletionCheck[]> {
  if (ids.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, role: true },
  });
  return users.map((u) => ({ id: u.id, role: u.role as "ADMIN" | "EMPLEADO" }));
}

export interface EmployeeRemovalResult {
  requested: number;
  removed: number;
}

// Eliminación real vía auth.api.removeUser (admin plugin, better-auth@1.4.12)
// — nunca prisma.user.delete(). Secuencial; si CUALQUIER llamada lanza, se
// re-lanza de inmediato (sin continuar con el resto de la lista) para que
// executeReconstruction() aborte con failedPhase:"employees". No se envuelve
// en una transacción Prisma — Better Auth nunca participa de
// prisma.$transaction() (limitación ya aceptada, no se inventa rollback).
export async function removeSelectedEmployees(
  userIds: string[],
): Promise<EmployeeRemovalResult> {
  if (userIds.length === 0) return { requested: 0, removed: 0 };

  const requestHeaders = await headers();
  let removed = 0;
  for (const userId of userIds) {
    await auth.api.removeUser({
      headers: requestHeaders,
      body: { userId },
    });
    removed++;
  }
  return { requested: userIds.length, removed };
}
