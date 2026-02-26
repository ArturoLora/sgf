// lib/domain/members/filters.ts
// Filtros puros del dominio de socios
// SIN dependencias externas
//
// NOTA: Este módulo depende implícitamente de `new Date()` (tiempo del sistema)
// para evaluar vigencia. Esta es una excepción documentada a la pureza estricta:
// los filtros de vigencia son inherentemente relativos al instante de ejecución.
// No se introduce I/O externo; `new Date()` es la única fuente de no-determinismo.

import type { Socio, SociosFiltros } from "./types";

// ==================== DATE HELPERS ====================

function parseDate(date: string | Date): Date {
  return typeof date === "string" ? new Date(date) : date;
}

function todayMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// ==================== FILTER FUNCTIONS ====================

function matchesBusqueda(member: Socio, busqueda: string): boolean {
  if (!busqueda) return true;
  const term = busqueda.toLowerCase();
  return (
    member.memberNumber.toLowerCase().includes(term) ||
    (member.name?.toLowerCase().includes(term) ?? false) ||
    (member.phone?.toLowerCase().includes(term) ?? false) ||
    (member.email?.toLowerCase().includes(term) ?? false)
  );
}

function matchesEstado(
  member: Socio,
  estado: SociosFiltros["estado"],
): boolean {
  if (estado === "todos") return true;
  return estado === "activos" ? member.isActive : !member.isActive;
}

function matchesVigencia(
  member: Socio,
  vigencia: SociosFiltros["vigencia"],
): boolean {
  if (vigencia === "todos") return true;

  if (vigencia === "sin_membresia") {
    return !member.membershipType || !member.endDate;
  }

  if (!member.endDate) return false;

  const today = todayMidnight();
  const end = parseDate(member.endDate);

  return vigencia === "vigentes" ? end >= today : end < today;
}

function matchesTipoMembresia(member: Socio, tipoMembresia: string): boolean {
  if (tipoMembresia === "todos") return true;
  return member.membershipType === tipoMembresia;
}

// ==================== SORT ====================

function sortMembers(
  members: Socio[],
  ordenarPor: SociosFiltros["ordenarPor"],
  orden: SociosFiltros["orden"],
): Socio[] {
  const sorted = [...members];

  sorted.sort((a, b) => {
    let valorA: string | number;
    let valorB: string | number;

    switch (ordenarPor) {
      case "nombre":
        valorA = a.name ?? "";
        valorB = b.name ?? "";
        break;
      case "fecha_registro":
        valorA = parseDate(a.createdAt).getTime();
        valorB = parseDate(b.createdAt).getTime();
        break;
      case "visitas":
        valorA = a.totalVisits;
        valorB = b.totalVisits;
        break;
      default:
        valorA = a.memberNumber;
        valorB = b.memberNumber;
    }

    if (valorA < valorB) return orden === "asc" ? -1 : 1;
    if (valorA > valorB) return orden === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
}

// ==================== MAIN FILTER ====================

export function filtrarSocios(
  members: Socio[],
  filtros: SociosFiltros,
): Socio[] {
  const filtered = members.filter(
    (m) =>
      matchesBusqueda(m, filtros.busqueda) &&
      matchesEstado(m, filtros.estado) &&
      matchesVigencia(m, filtros.vigencia) &&
      matchesTipoMembresia(m, filtros.tipoMembresia),
  );

  return sortMembers(filtered, filtros.ordenarPor, filtros.orden);
}

export function hayFiltrosActivos(filtros: SociosFiltros): boolean {
  return (
    filtros.busqueda !== "" ||
    filtros.estado !== "activos" ||
    filtros.vigencia !== "todos" ||
    filtros.tipoMembresia !== "todos"
  );
}
