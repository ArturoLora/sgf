// Pure domain — no Prisma, HTTP, or exceljs. Importable from client components.
// Story: Batching de Transporte HTTP para Importación de Lotes Grandes en Migración.

import type {
  AnalysisResultType,
  PreviewResponseType,
  ParseWarningType,
  MemberPreviewType,
  ShiftDetailType,
} from "@/types/api/migracion";
import type { DomainMember, DomainShift, MigrationMembershipType, MigrationPaymentMethod } from "./domain.types";

// ─── Partición por presupuesto de bytes ───────────────────────────────────────

export const MAX_BATCH_BYTES = 1.5 * 1024 * 1024; // 1,572,864 B — preventivo de CLIENTE
export const MAX_BATCH_FILES = 80; // salvaguarda secundaria, no el driver principal

// Greedy, un solo recorrido, preserva orden. Un item cuyo tamaño por sí solo
// excede maxBytes viaja solo en su propio batch (nunca se descarta, nunca se
// combina). Devuelve arreglos de índices sobre `items`, no los items mismos.
export function partitionByByteBudget<T>(
  items: T[],
  estimateBytes: (item: T) => number,
  opts: { maxBytes: number; maxFiles: number } = { maxBytes: MAX_BATCH_BYTES, maxFiles: MAX_BATCH_FILES },
): number[][] {
  const batches: number[][] = [];
  let current: number[] = [];
  let currentBytes = 0;

  for (let i = 0; i < items.length; i++) {
    const size = estimateBytes(items[i]);
    const wouldExceedBytes = currentBytes + size > opts.maxBytes;
    const wouldExceedCount = current.length + 1 > opts.maxFiles;

    if (current.length > 0 && (wouldExceedBytes || wouldExceedCount)) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }

    current.push(i);
    currentBytes += size;
  }

  if (current.length > 0) batches.push(current);
  return batches;
}

// Estimador de bytes UTF-8 de un valor serializado a JSON — usado para
// particionar DomainShift[] (no File[]) por presupuesto de bytes antes de
// enviarlos a las rutas /stage. TextEncoder existe tanto en navegador como en
// Node — mismo resultado que Buffer.byteLength(str, "utf8").
export function estimateJsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

// ─── Consolidación de /validate ───────────────────────────────────────────────

export function concatAnalysisResults(batches: AnalysisResultType[][]): AnalysisResultType[] {
  return batches.flat();
}

// ─── Detección global de folios duplicados ────────────────────────────────────
// No existe hoy ningún chequeo de unicidad de folio en previewFiles() — ver
// Story §"Ausencia total de validación de folios duplicados". Se aplica sobre
// el conjunto YA consolidado (global), nunca por-batch, para ser correcta
// independientemente de cuántos batches se usaron para transportar el lote.

export function detectDuplicateFolios(shifts: { folio: string }[]): ParseWarningType[] {
  const counts = new Map<string, number>();
  for (const s of shifts) counts.set(s.folio, (counts.get(s.folio) ?? 0) + 1);

  const warnings: ParseWarningType[] = [];
  for (const [folio, count] of counts) {
    if (count > 1) {
      warnings.push({
        filename: "",
        field: "folio",
        originalValue: folio,
        message: `Folio "${folio}" aparece ${count} veces entre los cortes analizados — posible duplicado`,
        code: "DUPLICATE_FOLIO",
      });
    }
  }
  return warnings;
}

function mergeDistributions(dists: Array<Partial<Record<string, number>>>): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const dist of dists) {
    for (const [key, value] of Object.entries(dist)) {
      merged[key] = (merged[key] ?? 0) + (value ?? 0);
    }
  }
  return merged;
}

function mergeSellerNames(lists: string[][]): string[] {
  return [...new Set(lists.flat())].sort();
}

// ─── Consolidación de /preview ────────────────────────────────────────────────
// members/shifts: concatenación (sin dedup — misma semántica que hoy).
// warnings: concatenación + detectDuplicateFolios sobre el conjunto global.
// membershipTypeDistribution: suma por clave. sellerNames: unión+dedup+sort.
// totalWarnings: recalculado DESPUÉS de agregar los warnings de folios duplicados.

export function consolidatePreviewBatches(batches: PreviewResponseType[]): PreviewResponseType {
  const members = batches.flatMap((b) => b.members);
  const shifts = batches.flatMap((b) => b.shifts);
  const baseWarnings = batches.flatMap((b) => b.warnings);
  const duplicateFolioWarnings = detectDuplicateFolios(shifts);
  const warnings = [...baseWarnings, ...duplicateFolioWarnings];
  const membershipTypeDistribution = mergeDistributions(batches.map((b) => b.membershipTypeDistribution));
  const sellerNames = mergeSellerNames(batches.map((b) => b.sellerNames));

  return {
    members,
    shifts,
    warnings,
    membershipTypeDistribution,
    totalWarnings: warnings.length,
    sellerNames,
  };
}

// ─── Rehidratación de Date tras JSON.parse ────────────────────────────────────
// JSON.stringify serializa Date -> ISO string automáticamente, pero
// JSON.parse NUNCA revive strings a Date — confirmado con evidencia real
// (round-trip sobre un shift real del lote, ver Story §"Rehidratación de
// Date"). Usar exclusivamente en los handlers de transporte (finalize,
// sync-members) — NUNCA dentro de syncMembers/syncShifts/finalizeSyncMode/
// executeReconstruction, que siguen esperando Date real como hoy.

function toDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

export function rehydrateShiftDates(raw: ShiftDetailType): DomainShift {
  return {
    folio: raw.folio,
    openingDate: toDate(raw.openingDate),
    openingTime: raw.openingTime,
    closingTime: raw.closingTime,
    cashierName: raw.cashierName,
    sales: raw.sales.map((sale) => ({
      ticket: sale.ticket,
      saleDate: toDate(sale.saleDate),
      memberNumber: sale.memberNumber,
      memberName: sale.memberName,
      description: sale.description,
      paymentMethod: sale.paymentMethod as MigrationPaymentMethod | null,
      sellerName: sale.sellerName,
      price: sale.price,
      discount: sale.discount,
      surcharge: sale.surcharge,
      isCancelled: sale.isCancelled,
      isMembership: sale.isMembership,
    })),
    inventory: raw.inventory.map((row) => ({
      productName: row.productName,
      gymStock: row.gymStock,
      warehouseStock: row.warehouseStock,
      adjustment: row.adjustment,
      entries: row.entries,
    })),
    withdrawals: raw.withdrawals.map((w) => ({
      withdrawalDate: toDate(w.withdrawalDate),
      concept: w.concept,
      amount: w.amount,
    })),
    legacyNotes: raw.legacyNotes,
    initialCash: raw.initialCash,
    ticketCount: raw.ticketCount,
    membershipSales: raw.membershipSales,
    productSales0Tax: raw.productSales0Tax,
    productSales16Tax: raw.productSales16Tax,
    subtotal: raw.subtotal,
    tax: raw.tax,
    totalSales: raw.totalSales,
    cashAmount: raw.cashAmount,
    debitCardAmount: raw.debitCardAmount,
    creditCardAmount: raw.creditCardAmount,
    totalVoucher: raw.totalVoucher,
    totalWithdrawalsAmount: raw.totalWithdrawalsAmount,
    totalCash: raw.totalCash,
  };
}

// ─── Completitud de staging antes de finalize ─────────────────────────────────
// `finalize` NUNCA debe ejecutar syncShifts/finalizeSyncMode/executeReconstruction
// sobre un conjunto de sub-batches incompleto (índices faltantes, discontinuos,
// fuera de rango, o con `totalBatches` inconsistente entre sub-batches — p.ej.
// tras un retry con una partición distinta). Pura, sin Prisma — testeable sin DB.

export interface StagingBatchMeta {
  batchIndex: number;
  totalBatches: number;
}

export type StagingCompletenessResult = { ok: true } | { ok: false; reason: string };

export function validateStagingCompleteness(rows: StagingBatchMeta[]): StagingCompletenessResult {
  if (rows.length === 0) {
    return { ok: false, reason: "No hay sub-batches en staging para este importId" };
  }

  const totalBatchesValues = new Set(rows.map((r) => r.totalBatches));
  if (totalBatchesValues.size !== 1) {
    return { ok: false, reason: "totalBatches inconsistente entre sub-batches — reinicia la importación" };
  }
  const totalBatches = rows[0].totalBatches;

  if (rows.length !== totalBatches) {
    return { ok: false, reason: `Faltan sub-batches: recibidos ${rows.length} de ${totalBatches} esperados` };
  }

  const indices = [...new Set(rows.map((r) => r.batchIndex))].sort((a, b) => a - b);
  if (indices.length !== totalBatches) {
    return { ok: false, reason: "Índices de sub-batch duplicados o inválidos" };
  }
  for (let i = 0; i < totalBatches; i++) {
    if (indices[i] !== i) {
      return {
        ok: false,
        reason: `Índices de sub-batch discontinuos o fuera de rango (esperado ${i}, encontrado ${indices[i]})`,
      };
    }
  }

  return { ok: true };
}

export function rehydrateMemberDates(raw: MemberPreviewType): DomainMember {
  return {
    memberNumber: raw.memberNumber,
    name: raw.name,
    phone: raw.phone,
    email: raw.email,
    birthDate: toDate(raw.birthDate),
    startDate: toDate(raw.startDate),
    endDate: toDate(raw.endDate),
    membershipType: raw.membershipType as MigrationMembershipType | null,
    membershipDescription: raw.membershipDescription,
    paymentMethodFromMembership: raw.paymentMethodFromMembership as MigrationPaymentMethod | null,
    totalVisits: raw.totalVisits,
    lastVisit: toDate(raw.lastVisit),
    isActive: raw.isActive,
  };
}
