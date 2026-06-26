// Pure Forma de Pago parser.
// Input: raw "MÉTODO" or "MÉTODO (NOMBRE)" string from Ventas sheet.

import type { FormaPagoParseResult, MigrationPaymentMethod } from "../domain.types";

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Extracts the name inside parentheses: "EFECTIVO (CARLOS)" → "CARLOS"
const SELLER_RE = /\(([^)]+)\)/;

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

export function parseFormaPago(raw: string | null): FormaPagoParseResult {
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
  const sellerName = sellerMatch ? sellerMatch[1].trim() || null : null;

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
