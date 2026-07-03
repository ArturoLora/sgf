// modules/users/domain/employee-filters.ts
// Filtros puros de empleados — SIN Prisma, SIN HTTP.

import type { Employee, Role } from "../types";

export interface EmployeeFilters {
  busqueda: string;
  rol: Role | "todos";
  estado: "todos" | "activos" | "inactivos";
}

export const FILTROS_INICIALES: EmployeeFilters = {
  busqueda: "",
  rol: "todos",
  estado: "todos",
};

function matchesBusqueda(employee: Employee, busqueda: string): boolean {
  if (!busqueda) return true;
  const term = busqueda.toLowerCase();
  return (
    employee.name.toLowerCase().includes(term) ||
    employee.email.toLowerCase().includes(term)
  );
}

function matchesRol(employee: Employee, rol: EmployeeFilters["rol"]): boolean {
  if (rol === "todos") return true;
  return employee.role === rol;
}

function matchesEstado(
  employee: Employee,
  estado: EmployeeFilters["estado"],
): boolean {
  if (estado === "todos") return true;
  return estado === "activos" ? employee.isActive : !employee.isActive;
}

export function filtrarEmpleados(
  employees: Employee[],
  filtros: EmployeeFilters,
): Employee[] {
  return employees.filter(
    (e) =>
      matchesBusqueda(e, filtros.busqueda) &&
      matchesRol(e, filtros.rol) &&
      matchesEstado(e, filtros.estado),
  );
}

export function hayFiltrosActivos(filtros: EmployeeFilters): boolean {
  return (
    filtros.busqueda !== "" ||
    filtros.rol !== "todos" ||
    filtros.estado !== "todos"
  );
}
