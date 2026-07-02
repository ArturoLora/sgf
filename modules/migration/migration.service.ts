import type { AnalysisResult, FileAdapter } from "./adapters/types";
import { xlsxSociosAdapter } from "./adapters/xlsx-socios.adapter";
import { xlsxCortesAdapter } from "./adapters/xlsx-cortes.adapter";
import { transformMembers } from "./domain/transformers/member-transformer";
import { transformShift } from "./domain/transformers/shift-transformer";
import type { PreviewFilesResult, ParseWarning, DomainMember, DomainShift } from "./domain/domain.types";
import { prisma } from "@/lib/db";
import type { MembershipType } from "@/app/generated/prisma";
import { buildMemberUpsertData } from "./domain/member-upsert";

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

export const MigrationService = { analyzeFile, analyzeFiles, previewFiles, syncMembers };
