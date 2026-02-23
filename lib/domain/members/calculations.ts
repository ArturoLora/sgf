// lib/domain/members/calculations.ts
// Funciones puras de cálculo para socios
// SIN dependencias externas

import type {
  Socio,
  SociosEstadisticas,
  EstadoVigencia,
  TipoMembresiaInfo,
} from "./types";
import { TIPOS_MEMBRESIA } from "./types";

// ==================== DATE HELPERS ====================

function parseDate(date: string | Date): Date {
  return typeof date === "string" ? new Date(date) : date;
}

function todayMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// ==================== STATS ====================

export function calcularEstadisticas(members: Socio[]): SociosEstadisticas {
  const today = todayMidnight();

  let activos = 0;
  let conMembresia = 0;
  let vencidos = 0;
  let totalVisitas = 0;

  for (const m of members) {
    if (m.isActive) activos++;
    totalVisitas += m.totalVisits;

    if (m.endDate) {
      const end = parseDate(m.endDate);
      if (end >= today) {
        conMembresia++;
      } else {
        vencidos++;
      }
    }
  }

  return {
    total: members.length,
    activos,
    conMembresia,
    vencidos,
    totalVisitas,
  };
}

// ==================== VIGENCIA ====================

export function obtenerEstadoVigencia(
  endDate: string | Date | undefined,
): EstadoVigencia {
  if (!endDate) return "sin_membresia";

  const today = todayMidnight();
  const end = parseDate(endDate);

  return end >= today ? "vigente" : "vencida";
}

// ==================== AGE ====================

export function calcularEdad(birthDate: string | Date): number {
  const nacimiento = parseDate(birthDate);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

// ==================== RENEWAL DATE CALCULATION ====================

export function calcularFechaFinRenovacion(
  tipoMembresia: string,
  endDateActual: string | Date | undefined,
): Date | null {
  const tipoInfo: TipoMembresiaInfo | undefined = TIPOS_MEMBRESIA.find(
    (t) => t.value === tipoMembresia,
  );
  if (!tipoInfo) return null;

  const hoy = todayMidnight();

  let fechaInicio = hoy;
  if (endDateActual) {
    const fechaFinActual = parseDate(endDateActual);
    if (fechaFinActual >= hoy) {
      fechaInicio = fechaFinActual;
    }
  }

  const fechaFin = new Date(fechaInicio);
  fechaFin.setDate(fechaFin.getDate() + tipoInfo.dias);

  return fechaFin;
}

// ==================== PAGINATION ====================

export function paginar<T>(
  items: T[],
  pagina: number,
  itemsPorPagina: number,
): { items: T[]; totalPaginas: number } {
  const totalPaginas = Math.max(1, Math.ceil(items.length / itemsPorPagina));
  const inicio = (pagina - 1) * itemsPorPagina;
  return {
    items: items.slice(inicio, inicio + itemsPorPagina),
    totalPaginas,
  };
}
