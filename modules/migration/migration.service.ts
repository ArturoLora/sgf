import type { AnalysisResult, FileAdapter } from "./adapters/types";
import { xlsxSociosAdapter } from "./adapters/xlsx-socios.adapter";
import { xlsxCortesAdapter } from "./adapters/xlsx-cortes.adapter";
import { transformMembers } from "./domain/transformers/member-transformer";
import { transformShift } from "./domain/transformers/shift-transformer";
import type { PreviewFilesResult, ParseWarning, DomainMember, DomainShift } from "./domain/domain.types";

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

  return {
    members: allMembers,
    shifts: allShifts,
    warnings: allWarnings,
    membershipTypeDistribution: distribution,
  };
}

export const MigrationService = { analyzeFile, analyzeFiles, previewFiles };
