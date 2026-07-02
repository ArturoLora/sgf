import type { AnalysisResult, FileAdapter } from "./adapters/types";
import { xlsxSociosAdapter } from "./adapters/xlsx-socios.adapter";
import { xlsxCortesAdapter } from "./adapters/xlsx-cortes.adapter";
import { transformMembers } from "./domain/transformers/member-transformer";
import { transformShift } from "./domain/transformers/shift-transformer";
import type { PreviewFilesResult, ParseWarning, DomainMember, DomainShift } from "./domain/domain.types";
import { prisma } from "@/lib/db";
import type { MembershipType, PaymentMethod } from "@/app/generated/prisma";
import { buildMemberUpsertData } from "./domain/member-upsert";
import {
  buildShiftUpsertData,
  buildSaleMovementData,
  buildInventoryAdjustmentMovements,
  buildWithdrawalData,
} from "./domain/shift-sync";

// Registry: add new format adapters here — no other file needs to change. (AD-1)
const ADAPTERS: FileAdapter[] = [xlsxSociosAdapter, xlsxCortesAdapter];

// ─── Story 1.1: analysis ──────────────────────────────────────────────────────

export async function analyzeFile(
  buffer: Buffer,
  filename: string,
): Promise<AnalysisResult> {
  for (const adapter of ADAPTERS) {
    const result = await adapter.tryAnalyze(buffer, filename);
    if (result !== null) return result;
  }
  return {
    filename,
    fileType: "unknown",
    validationStatus: "unknown",
    recordCount: 0,
    errorMessage:
      "Archivo no reconocido: no contiene las hojas esperadas (SOCIOS o Cierre/Ventas/Inventario)",
  };
}

export async function analyzeFiles(
  files: Array<{ buffer: Buffer; filename: string }>,
): Promise<AnalysisResult[]> {
  return Promise.all(files.map(({ buffer, filename }) => analyzeFile(buffer, filename)));
}

// ─── Story 1.2: preview (parse + transform, zero DB writes) ──────────────────

export async function previewFiles(
  files: Array<{ buffer: Buffer; filename: string }>,
): Promise<PreviewFilesResult> {
  const allMembers: DomainMember[] = [];
  const allShifts: DomainShift[] = [];
  const allWarnings: ParseWarning[] = [];

  await Promise.all(
    files.map(async ({ buffer, filename }) => {
      for (const adapter of ADAPTERS) {
        const canonical = await adapter.tryParse(buffer, filename);
        if (canonical === null) continue;

        if (canonical.type === "socios") {
          const result = transformMembers(canonical.members, filename);
          allMembers.push(...result.data);
          allWarnings.push(...result.warnings);
        } else if (canonical.type === "cortes") {
          const result = transformShift(canonical.shift, filename);
          allShifts.push(result.data);
          allWarnings.push(...result.warnings);
        }
        break; // stop at first adapter that recognized the file
      }
    }),
  );

  // Build membershipType distribution
  const distribution: Partial<Record<string, number>> = {};
  for (const member of allMembers) {
    const key = member.membershipType ?? "SIN_TIPO";
    distribution[key] = (distribution[key] ?? 0) + 1;
  }

  // Extract unique, sorted names needing employee mapping: per-sale sellers (Ventas!FormaPago)
  // and per-shift cashiers (Cierre!Cajero) — both resolve via the same employeeMapping (FR7).
  const allSellerNames = [
    ...new Set(
      [
        ...allShifts.flatMap((s) => s.sales.map((sale) => sale.sellerName)),
        ...allShifts.map((s) => s.cashierName),
      ].filter((n): n is string => n !== null && n.trim() !== ""),
    ),
  ].sort();

  return {
    members: allMembers,
    shifts: allShifts,
    warnings: allWarnings,
    membershipTypeDistribution: distribution,
    sellerNames: allSellerNames,
  };
}

// ─── Story 1.4: sync members (first real DB writes) ───────────────────────────

export interface SyncMembersResult {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ memberNumber: string; reason: string }>;
}

export async function syncMembers(members: DomainMember[]): Promise<SyncMembersResult> {
  const existingSet = new Set(
    (await prisma.member.findMany({ select: { memberNumber: true } })).map(
      (m) => m.memberNumber,
    ),
  );

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: Array<{ memberNumber: string; reason: string }> = [];

  for (const member of members) {
    const data = buildMemberUpsertData(member);
    const isNew = !existingSet.has(data.memberNumber);
    try {
      await prisma.member.upsert({
        where: { memberNumber: data.memberNumber },
        create: {
          ...data,
          membershipType: data.membershipType as MembershipType | null,
        },
        update: {
          name: data.name,
          phone: data.phone,
          email: data.email,
          birthDate: data.birthDate,
          startDate: data.startDate,
          endDate: data.endDate,
          membershipType: data.membershipType as MembershipType | null,
          membershipDescription: data.membershipDescription,
          totalVisits: data.totalVisits,
          lastVisit: data.lastVisit,
          isActive: data.isActive,
        },
      });
      if (isNew) {
        created++;
        existingSet.add(data.memberNumber);
      } else {
        updated++;
      }
    } catch (e) {
      failed++;
      errors.push({
        memberNumber: data.memberNumber,
        reason: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  return { created, updated, failed, errors };
}

// ─── Story 1.5: sync shifts, inventory movements, cash withdrawals ────────────

export interface SyncShiftsResult {
  shiftsCreated: number;
  shiftsUpdated: number;
  shiftsFailed: number;
  movementsCreated: number;
  withdrawalsCreated: number;
  warnings: Array<{ folio: string; message: string }>;
  errors: Array<{ folio: string; reason: string }>;
}

export async function syncShifts(
  shifts: DomainShift[],
  employeeMapping: Record<string, string>,
): Promise<SyncShiftsResult> {
  // AC1: chronological order. Shifts with unparseable openingDate sort last —
  // they fail individually below rather than blocking the whole batch.
  const sorted = [...shifts].sort(
    (a, b) => (a.openingDate?.getTime() ?? Infinity) - (b.openingDate?.getTime() ?? Infinity),
  );

  const memberIdByNumber = new Map(
    (await prisma.member.findMany({ select: { id: true, memberNumber: true } })).map(
      (m) => [m.memberNumber, m.id] as const,
    ),
  );

  let shiftsCreated = 0;
  let shiftsUpdated = 0;
  let shiftsFailed = 0;
  let movementsCreated = 0;
  let withdrawalsCreated = 0;
  const warnings: Array<{ folio: string; message: string }> = [];
  const errors: Array<{ folio: string; reason: string }> = [];

  for (const shift of sorted) {
    try {
      if (!shift.openingDate) {
        throw new Error("Fecha de apertura inválida o ausente en el Cierre");
      }
      const cashierId = shift.cashierName ? employeeMapping[shift.cashierName] : undefined;
      if (!cashierId) {
        throw new Error(
          `Cajero '${shift.cashierName ?? "(sin nombre)"}' sin mapeo resuelto — resuelve el mapeo de empleados antes de importar`,
        );
      }
      if (shift.legacyNotes) {
        warnings.push({ folio: shift.folio, message: `Campos legacy sin equivalente: ${shift.legacyNotes}` });
      }

      const openingDate = shift.openingDate;

      // Resolve/upsert Products BEFORE the transaction. Product is a global
      // catalog entity, not corte-scoped data — it doesn't need to roll back
      // with the shift, and keeping it out of the transaction avoids one
      // network round-trip per unique product against the remote DB.
      const productNames = new Set<string>([
        ...shift.sales.map((s) => s.description),
        ...shift.inventory
          .filter((row) => row.adjustment !== 0 || row.entries !== 0)
          .map((row) => row.productName),
      ]);
      const productIdByName = new Map<string, number>();
      for (const name of productNames) {
        const product = await prisma.product.upsert({
          where: { name },
          create: { name },
          update: {},
          select: { id: true },
        });
        productIdByName.set(name, product.id);
      }

      const saleMovements = shift.sales.map((sale) => {
        const data = buildSaleMovementData(sale, openingDate);
        return {
          productId: productIdByName.get(sale.description)!,
          memberId: sale.memberNumber ? memberIdByNumber.get(sale.memberNumber) ?? null : null,
          userId: sale.sellerName ? employeeMapping[sale.sellerName] ?? cashierId : cashierId,
          type: data.type,
          location: data.location,
          quantity: data.quantity,
          ticket: data.ticket,
          unitPrice: data.unitPrice,
          subtotal: data.subtotal,
          discount: data.discount,
          surcharge: data.surcharge,
          total: data.total,
          paymentMethod: data.paymentMethod as PaymentMethod | null,
          isCancelled: data.isCancelled,
          date: data.date,
        };
      });

      const adjustmentMovements = shift.inventory.flatMap((row) =>
        buildInventoryAdjustmentMovements(row, openingDate).map((adj) => ({
          productId: productIdByName.get(row.productName)!,
          userId: cashierId,
          type: adj.type,
          location: adj.location,
          quantity: adj.quantity,
          date: adj.date,
        })),
      );

      const withdrawalRecords = shift.withdrawals
        .map((w) => buildWithdrawalData(w, openingDate))
        .filter((data): data is NonNullable<typeof data> => data !== null)
        .map((data) => ({
          userId: cashierId,
          amount: data.amount,
          concept: data.concept,
          createdAt: data.createdAt,
        }));

      const shiftData = buildShiftUpsertData(
        shift.folio,
        cashierId,
        openingDate,
        shift,
        shift.legacyNotes ? JSON.stringify({ legacyFields: shift.legacyNotes }) : null,
      );

      // Lean transaction: shift upsert + replace children via createMany
      // (2–4 round-trips total regardless of record count, not N). Re-importing
      // the same corte must not duplicate movements/withdrawals (H1/H2) —
      // delete + recreate happens atomically, so a failure mid-way rolls back
      // to the previous state (AC13).
      const { isNew, movements, withdrawals } = await prisma.$transaction(async (tx) => {
        const existing = await tx.shift.findUnique({ where: { folio: shift.folio }, select: { id: true } });

        const dbShift = await tx.shift.upsert({
          where: { folio: shift.folio },
          create: shiftData,
          update: shiftData,
        });

        await tx.inventoryMovement.deleteMany({ where: { shiftId: dbShift.id } });
        await tx.cashWithdrawal.deleteMany({ where: { shiftId: dbShift.id } });

        if (saleMovements.length + adjustmentMovements.length > 0) {
          await tx.inventoryMovement.createMany({
            data: [...saleMovements, ...adjustmentMovements].map((m) => ({ ...m, shiftId: dbShift.id })),
          });
        }
        if (withdrawalRecords.length > 0) {
          await tx.cashWithdrawal.createMany({
            data: withdrawalRecords.map((w) => ({ ...w, shiftId: dbShift.id })),
          });
        }

        return {
          isNew: !existing,
          movements: saleMovements.length + adjustmentMovements.length,
          withdrawals: withdrawalRecords.length,
        };
      });

      if (isNew) shiftsCreated++;
      else shiftsUpdated++;
      movementsCreated += movements;
      withdrawalsCreated += withdrawals;
    } catch (e) {
      shiftsFailed++;
      errors.push({
        folio: shift.folio,
        reason: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  return { shiftsCreated, shiftsUpdated, shiftsFailed, movementsCreated, withdrawalsCreated, warnings, errors };
}

export const MigrationService = { analyzeFile, analyzeFiles, previewFiles, syncMembers, syncShifts };
