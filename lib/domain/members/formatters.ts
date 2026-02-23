// lib/domain/members/formatters.ts
// Funciones puras de formateo para socios
// SIN dependencias externas

import { TIPOS_MEMBRESIA_MAP } from "./types";

// ==================== DATE FORMATTING ====================

function parseDate(date: string | Date): Date {
  return typeof date === "string" ? new Date(date) : date;
}

export function formatearFecha(date: string | Date | undefined): string {
  if (!date) return "-";
  return parseDate(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatearFechaCorta(date: string | Date | undefined): string {
  if (!date) return "-";
  return parseDate(date).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatearFechaHora(date: string | Date | undefined): string {
  if (!date) return "-";
  return parseDate(date).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatearFechaISO(date: string | Date | undefined): string {
  if (!date) return "";
  const d = parseDate(date);
  return d.toISOString().split("T")[0];
}

// ==================== LABEL HELPERS ====================

export function obtenerLabelMembresia(type: string | undefined): string {
  if (!type) return "-";
  return TIPOS_MEMBRESIA_MAP[type] ?? type;
}
