// Story 2.1: Reconstruction mode — preview counts and backup strategy.
// Distinct use case from Sync mode (P-2: one Service per use case) — reuses
// nothing from adapters/parsers/sync, only Prisma reads and a pg_dump
// subprocess. No DELETE, no reimport — that's Story 2.2's responsibility.

import { prisma } from "@/lib/db";
import { execFile } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import path from "path";

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
  await execFileAsync("pg_dump", [databaseUrl, "-f", filePath], { timeout: 120_000 });

  const stats = await stat(filePath);

  return {
    filePath,
    fileSizeBytes: stats.size,
    restoreCommand: `psql "$DATABASE_URL" -f ${filePath}`,
  };
}
