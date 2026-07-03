// Story 2.1: Reconstruction mode — preview counts and backup strategy.
// Story 2.2: reconstruction execution — orchestrates the Epic 1 sync engine
// after a full operational-data wipe. Distinct use case from Sync mode
// (P-2: one Service per use case) — reuses nothing from adapters/parsers,
// only Prisma reads/writes, a pg_dump subprocess, and the EXISTING
// syncMembers()/syncShifts()/finalizeSyncMode() from migration.service.ts,
// called unmodified.

import { prisma } from "@/lib/db";
import { execFile } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import path from "path";
import {
  syncMembers,
  syncShifts,
  finalizeSyncMode,
  type SyncMembersResult,
  type SyncShiftsResult,
  type FinalizeSyncResult,
} from "./migration.service";
import type { DomainMember, DomainShift } from "./domain/domain.types";
import { buildProductResetPlan } from "./domain/product-reset";
import { classifyReconstructionSeverity, type ReconstructionSeverity } from "./domain/reconstruction-report";

const execFileAsync = promisify(execFile);

export interface ReconstructionPreview {
  membersToDelete: number;
  shiftsToDelete: number;
  movementsToDelete: number;
  withdrawalsToDelete: number;
  usersToPreserve: number;
}

// Read-only — zero writes, zero deletes. Mirrors AD-1's "preview never
// mutates" principle from Story 1.2's previewFiles(), applied to Reconstruction.
export async function getReconstructionPreview(): Promise<ReconstructionPreview> {
  const [membersToDelete, shiftsToDelete, movementsToDelete, withdrawalsToDelete, usersToPreserve] =
    await Promise.all([
      prisma.member.count(),
      prisma.shift.count(),
      prisma.inventoryMovement.count(),
      prisma.cashWithdrawal.count(),
      prisma.user.count(),
    ]);
  return { membersToDelete, shiftsToDelete, movementsToDelete, withdrawalsToDelete, usersToPreserve };
}

export interface PgDumpAvailability {
  available: boolean;
  reason: string | null;
}

// Detected at request time — never assumed from platform/env name (F1).
export async function checkPgDumpAvailability(): Promise<PgDumpAvailability> {
  try {
    await execFileAsync("pg_dump", ["--version"]);
    return { available: true, reason: null };
  } catch (e) {
    return {
      available: false,
      reason: e instanceof Error ? e.message : "pg_dump no está disponible en este entorno",
    };
  }
}

export interface BackupResult {
  filePath: string;
  fileSizeBytes: number;
  restoreCommand: string;
}

// Writes to /tmp — the only writable path in serverless environments
// (Vercel-style), consistent with the fallback scenario NFR6 anticipates.
export async function runDatabaseBackup(): Promise<BackupResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está configurado — no se puede generar el respaldo");
  }

  const filePath = path.join("/tmp", `sgf-backup-${Date.now()}.sql`);

  // The connection string (with credentials) is passed to the pg_dump
  // subprocess directly — it must NEVER be included in the response sent to
  // the client. restoreCommand references $DATABASE_URL symbolically instead
  // of interpolating the actual secret.
  //
  // On failure, Node's execFile error embeds the full command line —
  // argv, including databaseUrl — in its .message (verified: "Command
  // failed: pg_dump <connection-string-with-credentials> -f <path>").
  // That raw error must never leave this function: log it server-side only,
  // rethrow a sanitized message with zero connection details.
  try {
    await execFileAsync("pg_dump", [databaseUrl, "-f", filePath], { timeout: 120_000 });
  } catch (e) {
    console.error("pg_dump backup failed:", e);
    throw new Error("No se pudo generar el respaldo — revisa los registros del servidor para más detalle");
  }

  const stats = await stat(filePath);

  return {
    filePath,
    fileSizeBytes: stats.size,
    restoreCommand: `psql "$DATABASE_URL" -f ${filePath}`,
  };
}

// ─── Story 2.2: reconstruction execution ──────────────────────────────────────

export interface DeleteOperationalDataResult {
  cashWithdrawalsDeleted: number;
  movementsDeleted: number;
  shiftsDeleted: number;
  membersDeleted: number;
}

// FK-safe order verified against prisma/schema.prisma — InventoryMovement and
// CashWithdrawal have no onDelete: Cascade on their Member/Shift relations,
// so children must be deleted before parents (G3). One transaction: if any
// step fails, everything rolls back and the database is untouched (AC2).
async function deleteOperationalData(): Promise<DeleteOperationalDataResult> {
  return prisma.$transaction(async (tx) => {
    const { count: cashWithdrawalsDeleted } = await tx.cashWithdrawal.deleteMany({});
    const { count: movementsDeleted } = await tx.inventoryMovement.deleteMany({});
    const { count: shiftsDeleted } = await tx.shift.deleteMany({});
    const { count: membersDeleted } = await tx.member.deleteMany({});
    return { cashWithdrawalsDeleted, movementsDeleted, shiftsDeleted, membersDeleted };
  });
}

export interface ProductResetResult {
  productsRecreated: number;
  taxRatesPreserved: number;
}

// New logic — no equivalent exists in Epic 1 (G2). syncShifts() only does a
// lazy per-corte upsert with update:{} (a no-op on existing rows), so seeding
// products here first is compatible with it: syncShifts() will find these
// already created and leave them untouched.
async function resetProducts(productNames: string[]): Promise<ProductResetResult> {
  const existing = await prisma.product.findMany({ select: { name: true, taxRate: true } });
  const taxRateByName = new Map(existing.map((p) => [p.name, Number(p.taxRate)]));

  await prisma.product.deleteMany({});

  const plan = buildProductResetPlan(taxRateByName, productNames);
  let taxRatesPreserved = 0;
  for (const entry of plan) {
    if (entry.preserved) taxRatesPreserved++;
    await prisma.product.create({ data: { name: entry.name, taxRate: entry.taxRate } });
  }

  return { productsRecreated: plan.length, taxRatesPreserved };
}

export type ReconstructionPhase = "validation" | "delete" | "products" | "members" | "shifts" | "finalize";

export interface ReconstructionExecutionResult {
  success: boolean;
  failedPhase: ReconstructionPhase | null;
  failureMessage: string | null;
  deleteResult: DeleteOperationalDataResult | null;
  productResult: ProductResetResult | null;
  membersResult: SyncMembersResult | null;
  shiftsResult: SyncShiftsResult | null;
  finalizeResult: FinalizeSyncResult | null;
  finalizeWarning: string | null;
}

// Orchestrator only — every real use case (parsing, sync, finalization) is
// Epic 1's syncMembers()/syncShifts()/finalizeSyncMode(), called unmodified.
// syncMembers/syncShifts tolerate partial per-record failure by design (Sync
// mode); after a full wipe, any failure count is treated as a phase failure
// here (G4) — the underlying functions are not changed to do this themselves.
export async function executeReconstruction(
  members: DomainMember[],
  shifts: DomainShift[],
  employeeMapping: Record<string, string>,
  reimportProducts: boolean,
): Promise<ReconstructionExecutionResult> {
  // Guard: refuse to wipe the database when the replacement data is empty.
  // FileUploadStep/PreviewStep never required both socios and cortes files
  // together — that permissiveness is correct for Sync mode (incremental
  // partial imports) but catastrophic here, since syncMembers([])/
  // syncShifts([]) "succeed" trivially with zero records. No DELETE runs
  // until both collections are confirmed non-empty.
  if (members.length === 0 || shifts.length === 0) {
    return {
      success: false,
      failedPhase: "validation",
      failureMessage:
        "No se detectaron socios y/o cortes en los archivos subidos — la reconstrucción requiere ambos tipos de archivo con contenido válido. No se eliminó ningún dato.",
      deleteResult: null,
      productResult: null,
      membersResult: null,
      shiftsResult: null,
      finalizeResult: null,
      finalizeWarning: null,
    };
  }

  let productNames: string[] = [];
  if (reimportProducts) {
    productNames = shifts.flatMap((shift) => shift.inventory.map((row) => row.productName));
    if (productNames.length === 0) {
      return {
        success: false,
        failedPhase: "validation",
        failureMessage:
          "Se pidió reimportar productos, pero no se encontró ningún producto en las hojas de Inventario de los archivos subidos. No se eliminó ningún dato.",
        deleteResult: null,
        productResult: null,
        membersResult: null,
        shiftsResult: null,
        finalizeResult: null,
        finalizeWarning: null,
      };
    }
  }

  let deleteResult: DeleteOperationalDataResult;
  try {
    deleteResult = await deleteOperationalData();
  } catch (e) {
    return {
      success: false,
      failedPhase: "delete",
      failureMessage:
        "No se pudo completar el borrado de datos operativos. La transacción se revirtió — la base de datos no fue modificada. " +
        (e instanceof Error ? e.message : "Error desconocido"),
      deleteResult: null,
      productResult: null,
      membersResult: null,
      shiftsResult: null,
      finalizeResult: null,
      finalizeWarning: null,
    };
  }

  let productResult: ProductResetResult | null = null;
  if (reimportProducts) {
    try {
      productResult = await resetProducts(productNames);
    } catch (e) {
      return {
        success: false,
        failedPhase: "products",
        failureMessage:
          "La base de datos fue vaciada pero el reset de productos falló. Restaura desde el respaldo para recuperar el estado anterior. " +
          (e instanceof Error ? e.message : "Error desconocido"),
        deleteResult,
        productResult: null,
        membersResult: null,
        shiftsResult: null,
        finalizeResult: null,
        finalizeWarning: null,
      };
    }
  }

  let membersResult: SyncMembersResult;
  try {
    membersResult = await syncMembers(members);
  } catch (e) {
    return {
      success: false,
      failedPhase: "members",
      failureMessage:
        "La base de datos fue vaciada pero la importación de socios falló. Restaura desde el respaldo para recuperar el estado anterior. " +
        (e instanceof Error ? e.message : "Error desconocido"),
      deleteResult,
      productResult,
      membersResult: null,
      shiftsResult: null,
      finalizeResult: null,
      finalizeWarning: null,
    };
  }
  if (membersResult.failed > 0) {
    return {
      success: false,
      failedPhase: "members",
      failureMessage:
        "La base de datos fue vaciada pero la importación de socios falló. Restaura desde el respaldo para recuperar el estado anterior.",
      deleteResult,
      productResult,
      membersResult,
      shiftsResult: null,
      finalizeResult: null,
      finalizeWarning: null,
    };
  }

  let shiftsResult: SyncShiftsResult;
  try {
    shiftsResult = await syncShifts(shifts, employeeMapping);
  } catch (e) {
    return {
      success: false,
      failedPhase: "shifts",
      failureMessage:
        "La base de datos fue vaciada, los socios se importaron, pero la importación de cortes falló. Restaura desde el respaldo para recuperar el estado anterior. " +
        (e instanceof Error ? e.message : "Error desconocido"),
      deleteResult,
      productResult,
      membersResult,
      shiftsResult: null,
      finalizeResult: null,
      finalizeWarning: null,
    };
  }
  if (shiftsResult.shiftsFailed > 0) {
    return {
      success: false,
      failedPhase: "shifts",
      failureMessage:
        "La base de datos fue vaciada, los socios se importaron, pero la importación de cortes falló. Restaura desde el respaldo para recuperar el estado anterior.",
      deleteResult,
      productResult,
      membersResult,
      shiftsResult,
      finalizeResult: null,
      finalizeWarning: null,
    };
  }

  // finalizeSyncMode failure is a warning, not a phase failure (AC9) — members
  // and shifts are already complete and consistent at this point.
  let finalizeResult: FinalizeSyncResult | null = null;
  let finalizeWarning: string | null = null;
  try {
    finalizeResult = await finalizeSyncMode(shifts, shiftsResult);
  } catch (e) {
    finalizeWarning =
      "La reconstrucción de datos operativos se completó correctamente, pero la reconciliación final (gymStock/reporte) falló: " +
      (e instanceof Error ? e.message : "Error desconocido");
  }

  return {
    success: true,
    failedPhase: null,
    failureMessage: null,
    deleteResult,
    productResult,
    membersResult,
    shiftsResult,
    finalizeResult,
    finalizeWarning,
  };
}

// ─── Story 2.3: post-reconstruction validation (read-only) ────────────────────

export interface ReconstructionValidation {
  actualMembers: number;
  expectedMembers: number;
  memberCountMatches: boolean;
  actualShifts: number;
  expectedShifts: number;
  shiftCountMatches: boolean;
  orphanCount: number;
  orphanDetails: string[];
  severity: ReconstructionSeverity;
}

// Purely diagnostic — runs strictly after executeReconstruction() already
// committed (or not). Never reverts, blocks, or modifies anything (Alcance).
// Orphan checks are structurally guaranteed to find nothing given real
// Postgres FK constraints (no relationMode configured — H2); they still run
// as cheap, auditable confirmation for the report.
export async function validateReconstruction(
  expectedMembers: number,
  expectedShifts: number,
  consistencyWarningCount: number,
): Promise<ReconstructionValidation> {
  const [actualMembers, actualShifts] = await Promise.all([
    prisma.member.count(),
    prisma.shift.count(),
  ]);

  const [orphanMembers, orphanShiftsOnMovements, orphanCashiers] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM inventory_movement im
      WHERE im."memberId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM member m WHERE m.id = im."memberId")
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM inventory_movement im
      WHERE im."shiftId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM shift s WHERE s.id = im."shiftId")
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM shift s
      WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = s."cashierId")
    `,
  ]);

  const orphanDetails: string[] = [];
  const memberOrphans = Number(orphanMembers[0]?.count ?? 0);
  const shiftOrphansOnMovements = Number(orphanShiftsOnMovements[0]?.count ?? 0);
  const cashierOrphans = Number(orphanCashiers[0]?.count ?? 0);
  if (memberOrphans > 0) {
    orphanDetails.push(`${memberOrphans} InventoryMovement con memberId inexistente`);
  }
  if (shiftOrphansOnMovements > 0) {
    orphanDetails.push(`${shiftOrphansOnMovements} InventoryMovement con shiftId inexistente`);
  }
  if (cashierOrphans > 0) {
    orphanDetails.push(`${cashierOrphans} Shift con cashierId inexistente`);
  }
  const orphanCount = memberOrphans + shiftOrphansOnMovements + cashierOrphans;

  const memberCountMatches = actualMembers === expectedMembers;
  const shiftCountMatches = actualShifts === expectedShifts;

  const severity = classifyReconstructionSeverity({
    memberCountMatches,
    shiftCountMatches,
    orphanCount,
    consistencyWarningCount,
  });

  return {
    actualMembers,
    expectedMembers,
    memberCountMatches,
    actualShifts,
    expectedShifts,
    shiftCountMatches,
    orphanCount,
    orphanDetails,
    severity,
  };
}
