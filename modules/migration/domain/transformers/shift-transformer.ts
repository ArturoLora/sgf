import type { CanonicalShift, CanonicalSale, CanonicalInventoryRow, CanonicalWithdrawal } from "../canonical.types";
import type {
  DomainShift, DomainSale, DomainInventoryRow, DomainWithdrawal,
  ParseResult, ParseWarning,
} from "../domain.types";
import { parseMembership } from "../parsers/membership-parser";
import { parseFormaPago } from "../parsers/payment-parser";
import { normalizeDate } from "../parsers/date-parser";

function transformSale(
  s: CanonicalSale,
  isCancelled: boolean,
  filename: string,
  row: number,
  warnings: ParseWarning[],
): DomainSale {
  // Parse fecha venta
  const dateResult = normalizeDate(s.fechaVenta);
  if (dateResult.warning) {
    warnings.push({ filename, row, field: "fechaVenta", originalValue: dateResult.rawInput, message: dateResult.warning.message, code: dateResult.warning.code });
  }

  // Parse forma de pago
  const pagoResult = parseFormaPago(s.formaPago, s.descripcion);
  if (pagoResult.warning) {
    warnings.push({ filename, row, field: "formaPago", originalValue: pagoResult.rawInput, message: pagoResult.warning.message, code: pagoResult.warning.code });
  }

  // Determine if this is a membership sale via the membership parser
  const membershipResult = parseMembership(s.descripcion);
  const isMembership = membershipResult.membershipType !== null;

  return {
    ticket: s.ticket,
    saleDate: dateResult.date,
    memberNumber: s.numSocio ?? null,
    memberName: s.socio ?? null,
    description: s.descripcion,
    paymentMethod: pagoResult.paymentMethod,
    sellerName: pagoResult.sellerName,
    price: s.precio,
    discount: s.descuento,
    surcharge: s.cargo,
    isCancelled,
    isMembership,
  };
}

function transformInventoryRow(row: CanonicalInventoryRow): DomainInventoryRow {
  return {
    productName: row.producto,
    gymStock: row.existenciaActual,
    warehouseStock: 0,
    adjustment: row.ajuste,
    entries: row.entradas,
    // row.salidas intentionally not carried — already covered by Ventas/Canceladas (H5).
  };
}

function transformWithdrawal(
  w: CanonicalWithdrawal,
  filename: string,
  row: number,
  warnings: ParseWarning[],
): DomainWithdrawal {
  const dateResult = normalizeDate(w.fechaRetiro);
  if (dateResult.warning) {
    warnings.push({ filename, row, field: "fechaRetiro", originalValue: dateResult.rawInput, message: dateResult.warning.message, code: dateResult.warning.code });
  }
  return { withdrawalDate: dateResult.date, concept: w.concepto, amount: w.efectivo };
}

function buildLegacyNotes(shift: CanonicalShift): string | null {
  const parts: string[] = [];
  if (shift.ventasAnticipo && shift.ventasAnticipo > 0) {
    parts.push(`Anticipo: $${shift.ventasAnticipo.toFixed(2)}`);
  }
  if (shift.comisionAPagar && shift.comisionAPagar > 0) {
    parts.push(`Comisión: $${shift.comisionAPagar.toFixed(2)}`);
  }
  if (shift.totalVentasWeb && shift.totalVentasWeb > 0) {
    parts.push(`Web: $${shift.totalVentasWeb.toFixed(2)}`);
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}

export function transformShift(
  shift: CanonicalShift,
  filename: string,
): ParseResult<DomainShift> {
  const warnings: ParseWarning[] = [];

  // Opening date
  const openingDateResult = normalizeDate(shift.fechaApertura);
  if (openingDateResult.warning) {
    warnings.push({ filename, field: "fechaApertura", originalValue: openingDateResult.rawInput, message: openingDateResult.warning.message, code: openingDateResult.warning.code });
  }

  // Sales
  const sales: DomainSale[] = shift.ventas.map((s, i) =>
    transformSale(s, false, filename, i + 1, warnings),
  );

  // Cancelled sales
  const cancelled: DomainSale[] = shift.canceladas.map((s, i) =>
    transformSale(s, true, filename, i + 1, warnings),
  );

  // Inventory
  const inventory: DomainInventoryRow[] = shift.inventario.map(transformInventoryRow);

  // Withdrawals
  const withdrawals: DomainWithdrawal[] = shift.retiros.map((w, i) =>
    transformWithdrawal(w, filename, i + 1, warnings),
  );

  return {
    data: {
      folio: shift.folio,
      openingDate: openingDateResult.date,
      openingTime: shift.horaInicio ?? null,
      closingTime: shift.horaFin ?? null,
      cashierName: shift.cajero?.trim() || null,
      sales: [...sales, ...cancelled],
      inventory,
      withdrawals,
      legacyNotes: buildLegacyNotes(shift),
      initialCash: shift.initialCash ?? 0,
      ticketCount: shift.ticketCount ?? 0,
      membershipSales: shift.membershipSales ?? 0,
      productSales0Tax: shift.productSales0Tax ?? 0,
      productSales16Tax: shift.productSales16Tax ?? 0,
      subtotal: shift.subtotal ?? 0,
      tax: shift.tax ?? 0,
      totalSales: shift.totalSales ?? 0,
      cashAmount: shift.cashAmount ?? 0,
      debitCardAmount: shift.debitCardAmount ?? 0,
      creditCardAmount: shift.creditCardAmount ?? 0,
      totalVoucher: shift.totalVoucher ?? 0,
      totalWithdrawalsAmount: shift.totalWithdrawalsAmount ?? 0,
      totalCash: shift.totalCash ?? 0,
    },
    warnings,
  };
}
