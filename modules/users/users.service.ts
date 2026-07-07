import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseBooleanQuery } from "@/services/utils";
import {
  CreateEmployeeInputSchema,
  UpdateEmployeeInputSchema,
  SetEmployeeActiveInputSchema,
  ResetPasswordInputSchema,
} from "@/types/api/users";
import type {
  UsersQueryInput,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  SetEmployeeActiveInput,
  ResetPasswordInput,
} from "@/types/api/users";
import type { Employee, Role } from "./types";

const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  phone: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

const DUPLICATE_EMAIL_MESSAGE = "El correo electrónico ya está registrado";

export interface ListEmployeesParams {
  search?: string;
  role?: Role;
  isActive?: boolean;
}

export function parseUsersQuery(raw: UsersQueryInput): ListEmployeesParams {
  return {
    search: raw.search,
    role: raw.role,
    isActive: parseBooleanQuery(raw.isActive),
  };
}

export function parseCreateEmployeeInput(raw: unknown): CreateEmployeeInput {
  return CreateEmployeeInputSchema.parse(raw);
}

export function parseUpdateEmployeeInput(raw: unknown): UpdateEmployeeInput {
  return UpdateEmployeeInputSchema.parse(raw);
}

export function parseSetEmployeeActiveInput(
  raw: unknown,
): SetEmployeeActiveInput {
  return SetEmployeeActiveInputSchema.parse(raw);
}

export function parseResetPasswordInput(raw: unknown): ResetPasswordInput {
  return ResetPasswordInputSchema.parse(raw);
}

export async function listEmployees(
  params?: ListEmployeesParams,
): Promise<Employee[]> {
  const where: {
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
    }>;
    role?: Role;
    isActive?: boolean;
  } = {};

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params?.role) where.role = params.role;
  if (params?.isActive !== undefined) where.isActive = params.isActive;

  return prisma.user.findMany({
    where,
    select: EMPLOYEE_SELECT,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

// Crea User + Account (password hasheado) vía Better Auth — nunca
// prisma.user.create() directo (dejaría al empleado sin credencial
// utilizable, mismo bug que tenía el services/users.service.ts eliminado en
// Story 3.1).
//
// H1 corregido durante implementación (evidencia real, no solo lectura de
// código): `data` en createUser() SÍ llega hasta el adapter, pero el adapter
// factory de Better Auth (@better-auth/core/db/adapter, transformInput())
// solo procesa campos declarados en su propio `schema` (core + additionalFields
// registrados) — recorre `for (const field in schema[model].fields)`, nunca
// las claves de `data`. `phone`/`notes` no están registrados en ningún
// `schema` de Better Auth (no son additionalFields, a diferencia de `role`,
// que sí lo declara el plugin admin) — se descartan en silencio antes de
// llegar a Prisma. Confirmado creando un empleado real vía la API con
// phone/notes no vacíos: la fila quedó con phone=null, notes=null pese a
// `data: { phone, notes }`. `role` sí persiste porque el plugin admin lo
// registra en su propio schema (`mergeSchema`). Por eso phone/notes (e
// isActive, tampoco registrado) se completan con un `prisma.user.update()`
// inmediato — ya no "en la misma operación" como decía el AC original de
// epics.md, pero sigue siendo Better Auth + Prisma coordinados en un único
// método de este Service (P-2), sin crear un segundo camino de escritura.
export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<Employee> {
  let userId: string;
  try {
    const result = await auth.api.createUser({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
        role: input.role,
      },
    });
    userId = result.user.id;
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.toLowerCase().includes("already exists")) {
      throw new Error(DUPLICATE_EMAIL_MESSAGE);
    }
    throw e;
  }

  // Better Auth y Prisma no comparten una transacción — createUser() y este
  // update() son dos escrituras secuenciales, no atómicas. Si el update
  // falla, el User+Account de createUser() ya persistieron con credencial
  // utilizable (verificado empíricamente en el review de esta historia:
  // login real funciona pese al fallo del segundo paso), y el admin vería
  // un error de "creación fallida" sobre un empleado que en realidad sí
  // existe y puede iniciar sesión — un huérfano no rastreado, más grave si
  // el rol es ADMIN. Se revierte con un delete de mejor esfuerzo (cascada
  // sobre Account/Session vía el schema) para que el alta sea todo-o-nada
  // desde la perspectiva del admin, sin transacción cross-sistema imposible
  // de compartir con Better Auth.
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        isActive: true,
      },
      select: EMPLOYEE_SELECT,
    });
  } catch {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    throw new Error(
      "No se pudo completar el alta del empleado — la operación se revirtió, intenta de nuevo",
    );
  }
}

// Story 3.3 H5: edición vía Prisma directo — role/isActive/phone/notes
// siguen siendo campos gestionados por SGF, no por el plugin admin (AD-U2).
// No se usa auth.api.adminUpdateUser (evita un segundo camino de escritura
// para el mismo caso de uso, P-8).
export async function updateEmployee(
  id: string,
  input: UpdateEmployeeInput,
): Promise<Employee> {
  if (input.email) {
    const existing = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id } },
      select: { id: true },
    });
    if (existing) throw new Error(DUPLICATE_EMAIL_MESSAGE);
  }

  return prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      phone: input.phone,
      notes: input.notes,
    },
    select: EMPLOYEE_SELECT,
  });
}

const NOT_FOUND_MESSAGE = "Empleado no encontrado";
const LAST_ACTIVE_ADMIN_MESSAGE =
  "No puedes desactivar al único administrador activo";

export interface SetEmployeeActiveResult {
  employee: Employee;
  sessionsRevoked: boolean;
}

// Story 3.4 — orden fail-safe: isActive=false se persiste PRIMERO, la
// revocación de sesiones ocurre DESPUÉS. Better Auth y Prisma no comparten
// transacción (mismo hallazgo raíz que el Critical de Story 3.3), pero al
// revés que ahí, aquí el orden elegido no necesita compensación: si
// revokeUserSessions() falla, isActive ya quedó en false — requireAuth()
// (lib/require-role.ts) y las rutas endurecidas de /api/usuarios/* (ver
// Story 3.4 H3) ya bloquean cualquier acceso funcional sin depender de que
// la revocación haya tenido éxito. El orden inverso (revocar primero) no
// tendría esta garantía: si el update a isActive=false fallara después,
// el empleado podría iniciar sesión de nuevo sin ninguna restricción.
//
// H1 (Story 3.4): auth.api.revokeUserSessions() usa adminMiddleware, que
// exige incondicionalmente una sesión resoluble desde headers — a diferencia
// de createUser() (Story 3.3), aquí SÍ se pasan los headers reales de la
// request del ADMIN que ejecuta la acción.
//
// Límite documentado (concurrencia): el chequeo de "único ADMIN activo" lee
// el conteo y luego escribe dentro de la misma transacción de Prisma, lo
// cual evita interferencia con otras operaciones de este mismo proceso,
// pero no garantiza serialización completa frente a dos requests
// concurrentes desactivando dos ADMIN distintos al mismo tiempo bajo el
// nivel de aislamiento por defecto de Postgres (READ COMMITTED) — cerrar
// esa ventana por completo requeriría SERIALIZABLE o locks explícitos de
// fila, fuera de alcance para el volumen real de administradores de SGF.
export async function setEmployeeActive(
  id: string,
  isActive: boolean,
): Promise<SetEmployeeActiveResult> {
  if (!isActive) {
    const employee = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { role: true, isActive: true },
      });
      if (!target) throw new Error(NOT_FOUND_MESSAGE);

      if (target.role === "ADMIN" && target.isActive) {
        const activeAdmins = await tx.user.count({
          where: { role: "ADMIN", isActive: true },
        });
        if (activeAdmins <= 1) throw new Error(LAST_ACTIVE_ADMIN_MESSAGE);
      }

      return tx.user.update({
        where: { id },
        data: { isActive: false },
        select: EMPLOYEE_SELECT,
      });
    });

    let sessionsRevoked = true;
    try {
      await auth.api.revokeUserSessions({
        headers: await headers(),
        body: { userId: id },
      });
    } catch {
      sessionsRevoked = false;
    }

    return { employee, sessionsRevoked };
  }

  try {
    const employee = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: EMPLOYEE_SELECT,
    });
    return { employee, sessionsRevoked: true };
  } catch {
    throw new Error(NOT_FOUND_MESSAGE);
  }
}

const PASSWORD_TOO_SHORT_MESSAGE = "La contraseña debe tener al menos 6 caracteres";

// Story 3.5: reinicio de contraseña por ADMIN. Independiente de isActive —
// no lee ni escribe ese campo. auth.api.setUserPassword() usa adminMiddleware
// (mismo requisito que revokeUserSessions() en Story 3.4): exige headers
// reales de la sesión ADMIN que ejecuta la acción. La validación de longitud
// mínima ya la hace Better Auth internamente (minPasswordLength en lib/auth.ts)
// — este service no la reimplementa, solo traduce el error real si ocurre.
export async function resetEmployeePassword(
  id: string,
  newPassword: string,
): Promise<Employee> {
  const target = await prisma.user.findUnique({
    where: { id },
    select: EMPLOYEE_SELECT,
  });
  if (!target) throw new Error(NOT_FOUND_MESSAGE);

  try {
    await auth.api.setUserPassword({
      headers: await headers(),
      body: { userId: id, newPassword },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.toLowerCase().includes("password too short")) {
      throw new Error(PASSWORD_TOO_SHORT_MESSAGE);
    }
    throw e;
  }

  return target;
}

export const UsersService = {
  listEmployees,
  createEmployee,
  updateEmployee,
  setEmployeeActive,
  resetEmployeePassword,
  parseUsersQuery,
  parseCreateEmployeeInput,
  parseUpdateEmployeeInput,
  parseSetEmployeeActiveInput,
  parseResetPasswordInput,
};
