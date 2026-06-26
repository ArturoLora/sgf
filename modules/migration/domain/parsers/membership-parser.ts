// Pure, deterministic membership string parser.
// No side effects, no Prisma, no I/O.

import type {
  MembershipParseResult,
  MigrationMembershipType,
  MigrationPaymentMethod,
} from "../domain.types";

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const SPANISH_MONTH_ABBRS: Record<string, number> = {
  // 3-letter abbreviations
  ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5,
  JUL: 6, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DIC: 11,
  // Full names (historical Ventas sheet uses full names)
  ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5,
  JULIO: 6, AGOSTO: 7, SEPTIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11,
};

// Matches trailing "MES YYYY" — e.g. " ENE 2026" or " ENERO 2026"
const MONTH_YEAR_RE =
  /\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+(\d{4})$/;

interface TypeEntry {
  pattern: string;
  type: MigrationMembershipType;
  trainerName?: string;
  exact?: boolean; // only match remaining === pattern (not startsWith)
}

// Ordered from most specific to least specific to prevent early short-circuit matches.
const TYPE_TABLE: TypeEntry[] = [
  // ── Mensualidades ──
  { pattern: "MENSUALIDAD ESTUDIANTE", type: "MONTH_STUDENT" },
  { pattern: "MENSUALIDAD GENERAL",    type: "MONTH_GENERAL" },
  { pattern: "MENSUALIDAD LEO",        type: "MONTH_GENERAL", trainerName: "LEO" },
  { pattern: "MENSUALIDAD MATUTINO",   type: "MONTH_GENERAL" },
  { pattern: "MENSUALIDAD",            type: "MONTH_GENERAL" },
  // ── Anualidades ──
  { pattern: "ANUALIDAD ESTUDIANTE",   type: "ANNUAL_STUDENT" },
  { pattern: "ANUALIDAD GENERAL",      type: "ANNUAL_GENERAL" },
  { pattern: "ANUALIDAD",              type: "ANNUAL_GENERAL" },
  // ── Semana ──
  { pattern: "SEMANA LEO",             type: "WEEK", trainerName: "LEO" },
  { pattern: "SEMANA",                 type: "WEEK" },
  // ── Visita ──
  { pattern: "VISITA", type: "VISIT", exact: true },
  // ── Nutrición ──
  { pattern: "PACIENTES CONSULTA NACHO", type: "NUTRITION_CONSULTATION", trainerName: "NACHO" },
  { pattern: "PACIENTES NACHO",          type: "NUTRITION_CONSULTATION", trainerName: "NACHO" },
  // ── Reingreso ──
  { pattern: "RE NACER", type: "REBIRTH" },
  // ── Promociones — PRMOCION is the real typo found in historical data ──
  { pattern: "PRMOCION",  type: "PROMOTION" },
  { pattern: "PROMOCION", type: "PROMOTION" },
  // ── Precio Preferencial variants (Dec 2023 – Feb 2024) ──
  { pattern: "PPE", type: "MONTH_STUDENT", exact: true },
  { pattern: "PPG", type: "MONTH_GENERAL", exact: true },
  { pattern: "PPL", type: "MONTH_GENERAL", exact: true },
  // ── Standalone LEO (old entries circa Dec 2023) ──
  { pattern: "LEO", type: "MONTH_GENERAL", trainerName: "LEO", exact: true },
];

export function parseMembership(raw: string | null): MembershipParseResult {
  if (!raw || raw.trim() === "") {
    return {
      membershipType: null,
      paymentPrefix: null,
      trainerName: null,
      month: null,
      year: null,
      rawInput: raw ?? "",
      recognized: true,
      warning: null,
    };
  }

  // Normalize: uppercase + strip diacritics (handles PROMOCIÓN → PROMOCION)
  const normalized = stripDiacritics(raw.trim().toUpperCase());
  let remaining = normalized;
  let paymentPrefix: MigrationPaymentMethod | null = null;

  // Strip payment prefix EFECTIVO or TARJETA (they can appear before any membership type)
  if (remaining.startsWith("EFECTIVO ")) {
    paymentPrefix = "CASH";
    remaining = remaining.slice(9).trim();
  } else if (remaining.startsWith("TARJETA ")) {
    paymentPrefix = "DEBIT_CARD";
    remaining = remaining.slice(8).trim();
  }

  // Extract trailing "MES YYYY" suffix
  let month: number | null = null;
  let year: number | null = null;
  const monthYearMatch = remaining.match(MONTH_YEAR_RE);
  if (monthYearMatch) {
    const monthIdx = SPANISH_MONTH_ABBRS[monthYearMatch[1]];
    if (monthIdx !== undefined) {
      month = monthIdx + 1;
      year = parseInt(monthYearMatch[2], 10);
      remaining = remaining.slice(0, remaining.length - monthYearMatch[0].length).trim();
    }
  }

  // Match against type table
  for (const entry of TYPE_TABLE) {
    const matches = entry.exact
      ? remaining === entry.pattern
      : remaining === entry.pattern || remaining.startsWith(entry.pattern + " ");
    if (matches) {
      return {
        membershipType: entry.type,
        paymentPrefix,
        trainerName: entry.trainerName ?? null,
        month,
        year,
        rawInput: raw,
        recognized: true,
        warning: null,
      };
    }
  }

  return {
    membershipType: null,
    paymentPrefix,
    trainerName: null,
    month,
    year,
    rawInput: raw,
    recognized: false,
    warning: {
      code: "UNKNOWN_MEMBERSHIP",
      message: `Tipo de membresía no reconocido: "${raw}"`,
    },
  };
}
