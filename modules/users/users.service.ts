import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseBooleanQuery } from "@/services/utils";
import {
  CreateEmployeeInputSchema,
  UpdateEmployeeInputSchema,
} from "@/types/api/users";
import type {
  UsersQueryInput,
  CreateEmployeeInput,
  UpdateEmployeeInput,
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

  return prisma.user.update({
    where: { id: userId },
    data: {
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      isActive: true,
    },
    select: EMPLOYEE_SELECT,
  });
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

export const UsersService = {
  listEmployees,
  createEmployee,
  updateEmployee,
  parseUsersQuery,
  parseCreateEmployeeInput,
  parseUpdateEmployeeInput,
};
