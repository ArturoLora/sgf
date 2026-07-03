// modules/users/types.ts
// Tipos de dominio del módulo de Administración de Usuarios y Empleados.
// SIN dependencias externas (no @/types/api, no Prisma).
// Contrato base (Story 3.1) — los tipos de entrada para alta/edición/filtros
// se agregan en las historias 3.2-3.5 cuando esas operaciones se implementan.

export type Role = "ADMIN" | "EMPLEADO";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
