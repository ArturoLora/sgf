// Pure Forma de Pago parser.
// Input: raw "MÉTODO" or "MÉTODO (NOMBRE)" string from Ventas sheet.

import type { FormaPagoParseResult, MigrationPaymentMethod } from "../domain.types";

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Extracts the name inside parentheses: "EFECTIVO (CARLOS)" → "CARLOS"
const SELLER_RE = /\(([^)]+)\)/;

// Vocabulario genérico de anotación de caja histórica — no son nombres de
// empleados en ningún gimnasio, a diferencia de cualquier lista de personal
// (que cambia con el tiempo). Confirmado contra el lote real de docs/2026.
const ANNOTATION_WORDS = new Set(["CORRECCION", "REGALO", "POSIBLE ERROR", "ERROR", "AJUSTE"]);

// Distingue una anotación de caja (precio, corrección, eco del producto) de un
// nombre de vendedor real, sin depender de una lista de empleados ni del
// nombre de archivo. Cadenas de un solo carácter (ej. "D", "Z") nunca se
// descartan por coincidencia con la descripción — una sola letra coincide por
// azar con casi cualquier texto y no es señal real; sí se descartan si son
// puramente numéricas (ej. "0"), regla que tiene prioridad sobre la longitud.
function isAnnotationValue(candidate: string, saleDescription: string | null | undefined): boolean {
  const normalized = stripDiacritics(candidate.toUpperCase().trim());

  if (/^\d+$/.test(normalized)) return true;
  if (ANNOTATION_WORDS.has(normalized)) return true;

  if (saleDescription && normalized.length >= 2) {
    const desc = stripDiacritics(saleDescription.toUpperCase());
    if (desc.includes(normalized)) return true;
    if (normalized.length >= 4 && desc.startsWith(normalized.slice(0, 4))) return true;
  }

  return false;
}

interface MethodEntry {
  pattern: string; // normalized uppercase, no diacritics
  method: MigrationPaymentMethod;
  exact?: boolean;
}

// Ordered specific → general (TARJETA DEBITO before TARJETA)
const METHOD_TABLE: MethodEntry[] = [
  { pattern: "EFECTIVO",       method: "CASH",        exact: false },
  { pattern: "TARJETA DEBITO", method: "DEBIT_CARD",  exact: false },
  { pattern: "TARJETA CREDITO", method: "CREDIT_CARD", exact: false },
  { pattern: "TARJETA",        method: "DEBIT_CARD",  exact: false }, // default for bare TARJETA
  { pattern: "TRANSFERENCIA",  method: "TRANSFER",    exact: false },
  { pattern: "VOUCHER",        method: "DEBIT_CARD",  exact: false }, // treat voucher as debit
];

export function parseFormaPago(
  raw: string | null,
  saleDescription?: string | null,
): FormaPagoParseResult {
  if (!raw || raw.trim() === "") {
    return {
      paymentMethod: null,
      sellerName: null,
      rawInput: raw ?? "",
      recognized: true,
      warning: null,
    };
  }

  const trimmed = raw.trim();

  // Extract seller name from parentheses before stripping
  const sellerMatch = trimmed.match(SELLER_RE);
  const extractedName = sellerMatch ? sellerMatch[1].trim() || null : null;
  const sellerName =
    extractedName && !isAnnotationValue(extractedName, saleDescription) ? extractedName : null;

  // Remove parenthesized part to isolate the method portion
  const methodPart = trimmed.replace(SELLER_RE, "").trim();
  const normalized = stripDiacritics(methodPart.toUpperCase());

  for (const entry of METHOD_TABLE) {
    const normPattern = stripDiacritics(entry.pattern);
    const matches = normalized === normPattern || normalized.startsWith(normPattern + " ");
    if (matches) {
      return {
        paymentMethod: entry.method,
        sellerName,
        rawInput: raw,
        recognized: true,
        warning: null,
      };
    }
  }

  return {
    paymentMethod: null,
    sellerName,
    rawInput: raw,
    recognized: false,
    warning: {
      code: "UNKNOWN_PAYMENT_METHOD",
      message: `Forma de pago no reconocida: "${raw}"`,
    },
  };
}
