// Pure date parsing utilities.
// No side effects, no Prisma, no I/O.

import type { DateParseResult, DateFormat } from "../domain.types";

// ─── Spanish month abbreviations ──────────────────────────────────────────────

const SPANISH_MONTHS: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

// ─── Excel serial helpers ─────────────────────────────────────────────────────

// Excel epoch: Dec 30, 1899 (UTC)
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
// Excel incorrectly counts Feb 29, 1900 (serial 60) as a real day.
// All serials >= 60 are 1 day ahead of reality.
const EXCEL_LEAP_BUG_SERIAL = 60;

export function parseExcelDateSerial(serial: number): Date {
  const adjusted = serial >= EXCEL_LEAP_BUG_SERIAL ? serial - 1 : serial;
  return new Date(EXCEL_EPOCH_MS + adjusted * 86_400_000);
}

// Exceljs represents time-only cells as Date objects with base 1899-12-30.
// Returns local "HH:mm" string.
export function parseExcelTimeSerial(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// A Date whose year is 1899 or 1900 is an exceljs time-only value.
export function isExcelTimeDate(d: Date): boolean {
  const y = d.getFullYear();
  return y === 1899 || y === 1900;
}

// ─── Spanish date string parser ───────────────────────────────────────────────
// Handles:
//   "07-ene-2026 15:48"  (Ventas Fecha Venta)
//   "miércoles 07-ene-2026"  (Cierre Fecha Apertura — day-of-week prefix stripped)

const DATE_TIME_RE = /^(\d{1,2})-([a-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/i;
// Matches any leading Spanish day-of-week word + space
const DAY_OF_WEEK_RE = /^[a-záéíóúüñ]+\s+/i;

export function parseSpanishDateString(raw: string): Date | null {
  const cleaned = raw.trim().replace(DAY_OF_WEEK_RE, "");
  const m = cleaned.match(DATE_TIME_RE);
  if (!m) return null;
  const month = SPANISH_MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  const d = new Date(
    parseInt(m[3], 10),
    month,
    parseInt(m[1], 10),
    m[4] ? parseInt(m[4], 10) : 0,
    m[5] ? parseInt(m[5], 10) : 0,
  );
  return isNaN(d.getTime()) ? null : d;
}

// ─── Unified normalizer ────────────────────────────────────────────────────────
// Accepts any cell value type from the canonical model (string | number | Date | null).

export function normalizeDate(value: unknown): DateParseResult {
  const rawInput =
    value === null || value === undefined ? "" : String(value);

  if (value === null || value === undefined || rawInput === "") {
    return { date: null, rawInput: "", format: "empty", recognized: true, warning: null };
  }

  // Date object (exceljs auto-parsed date or time cells)
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return {
        date: null, rawInput,
        format: "unknown", recognized: false,
        warning: { code: "INVALID_DATE", message: `Fecha inválida: ${rawInput}` },
      };
    }
    if (isExcelTimeDate(value)) {
      // This is a time serial — callers should use parseExcelTimeSerial instead.
      return { date: value, rawInput, format: "excel-time", recognized: true, warning: null };
    }
    return { date: value, rawInput, format: "date-object", recognized: true, warning: null };
  }

  // Numeric Excel serial
  if (typeof value === "number") {
    if (!isFinite(value) || value < 0 || value > 100_000) {
      return {
        date: null, rawInput,
        format: "excel-serial", recognized: false,
        warning: { code: "INVALID_DATE_SERIAL", message: `Serial de fecha fuera de rango: ${value}` },
      };
    }
    return { date: parseExcelDateSerial(value), rawInput, format: "excel-serial", recognized: true, warning: null };
  }

  // String
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { date: null, rawInput: trimmed, format: "empty", recognized: true, warning: null };
    }

    // ISO 8601 (exceljs sometimes returns dates as ISO strings via toISOString())
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const iso = new Date(trimmed);
      if (!isNaN(iso.getTime())) {
        return { date: iso, rawInput: trimmed, format: "iso-string", recognized: true, warning: null };
      }
    }

    // Spanish date string ("dd-mmm-yyyy" or "día dd-mmm-yyyy" or "dd-mmm-yyyy HH:mm")
    const spanish = parseSpanishDateString(trimmed);
    if (spanish) {
      const format: DateFormat = trimmed.includes(":") ? "spanish-datetime" : "spanish-date";
      return { date: spanish, rawInput: trimmed, format, recognized: true, warning: null };
    }

    return {
      date: null, rawInput: trimmed,
      format: "unknown", recognized: false,
      warning: { code: "UNRECOGNIZED_DATE_FORMAT", message: `Formato de fecha no reconocido: "${trimmed}"` },
    };
  }

  return {
    date: null, rawInput,
    format: "unknown", recognized: false,
    warning: { code: "UNKNOWN_DATE_TYPE", message: `Tipo de valor de fecha inesperado: ${typeof value}` },
  };
}
