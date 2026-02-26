// lib/domain/members/formatters.ts
// Funciones puras de formateo para socios
// Delega a shared/formatters como única fuente de verdad

import {
  formatearFechaLarga as _formatearFechaLarga,
  formatearFechaCorta as _formatearFechaCorta,
  formatearFechaHora as _formatearFechaHora,
  formatearFechaISO as _formatearFechaISO,
} from "../shared/formatters";
import { TIPOS_MEMBRESIA_MAP } from "./types";

// ==================== DATE FORMATTING ====================

export function formatearFecha(date: string | Date | undefined): string {
  return _formatearFechaLarga(date);
}

export function formatearFechaCorta(date: string | Date | undefined): string {
  return _formatearFechaCorta(date);
}

export function formatearFechaHora(date: string | Date | undefined): string {
  return _formatearFechaHora(date);
}

export function formatearFechaISO(date: string | Date | undefined): string {
  return _formatearFechaISO(date);
}

// ==================== LABEL HELPERS ====================

export function obtenerLabelMembresia(type: string | undefined): string {
  if (!type) return "-";
  return TIPOS_MEMBRESIA_MAP[type] ?? type;
}
