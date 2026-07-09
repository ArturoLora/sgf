import { requireActiveAdminApi } from "@/lib/require-role";
import { prisma } from "@/lib/db";
import { executeReconstruction } from "@/modules/migration/reconstruction.service";
import { EmployeeMappingSchema, MemberPreviewSchema, ShiftDetailSchema } from "@/types/api/migracion";
import {
  rehydrateMemberDates,
  rehydrateShiftDates,
  validateStagingCompleteness,
} from "@/modules/migration/domain/upload-batching";
import { z } from "zod";

const KIND = "reconstruccion-ejecutar";

const FinalizeBodySchema = z.object({
  importId: z.string().min(1),
  members: z.array(MemberPreviewSchema),
  employeeMapping: EmployeeMappingSchema.optional().default({}),
  reimportProducts: z.boolean().default(false),
  usersToDelete: z.array(z.string().min(1)).default([]),
});

// Reconstruye el conjunto GLOBAL de shifts desde staging y ejecuta
// executeReconstruction EXACTAMENTE UNA VEZ — sin cambios en
// reconstruction.service.ts. members/employeeMapping/reimportProducts viajan
// directo en este body (ya medidos seguros, no requieren staging).
export async function POST(request: Request): Promise<Response> {
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;
  const adminUserId = check.session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const parsed = FinalizeBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Formato de finalize inválido" }, { status: 400 });
  }
  const { importId, employeeMapping, reimportProducts } = parsed.data;
  // Normaliza duplicados antes de validar — el contrato Zod por sí solo no
  // los previene (z.array(z.string()) permite repetidos).
  const dedupedUsersToDelete = [...new Set(parsed.data.usersToDelete)];

  // Aislamiento: solo filas de este importId Y de este admin Y de este kind.
  const rows = await prisma.migrationImportStaging.findMany({
    where: { importId, adminUserId, kind: KIND },
    orderBy: { batchIndex: "asc" },
  });

  // Completitud: rechaza batches faltantes, discontinuos, fuera de rango, o
  // con totalBatches inconsistente ANTES de ejecutar Reconstruction (destructiva).
  const completeness = validateStagingCompleteness(rows);
  if (!completeness.ok) {
    return Response.json({ error: completeness.reason }, { status: 400 });
  }

  // Claim atómico — crítico para Reconstruction (DELETE + recreate). Un solo
  // UPDATE condicionado a claimedAt:null asegura que, ante dos finalize
  // concurrentes para el mismo importId, solo uno ejecuta executeReconstruction.
  const claim = await prisma.migrationImportStaging.updateMany({
    where: { importId, adminUserId, kind: KIND, claimedAt: null },
    data: { claimedAt: new Date() },
  });
  if (claim.count !== rows.length) {
    return Response.json(
      { error: "Esta importación ya está siendo finalizada (posible doble ejecución) — no se ejecutó de nuevo" },
      { status: 409 },
    );
  }

  try {
    const rawShifts = rows.flatMap((row) => {
      const result = z.array(ShiftDetailSchema).safeParse(row.shiftsJson);
      return result.success ? result.data : [];
    });
    const shifts = rawShifts.map(rehydrateShiftDates);
    const members = parsed.data.members.map(rehydrateMemberDates);

    const result = await executeReconstruction(
      members,
      shifts,
      employeeMapping,
      reimportProducts,
      dedupedUsersToDelete,
      adminUserId,
    );

    // Cleanup en el camino feliz.
    await prisma.migrationImportStaging.deleteMany({ where: { importId, adminUserId, kind: KIND } });

    return Response.json(result);
  } catch (e) {
    // Libera el claim para permitir un retry legítimo — no se oculta el error,
    // no se ejecuta un segundo intento automático.
    await prisma.migrationImportStaging.updateMany({
      where: { importId, adminUserId, kind: KIND },
      data: { claimedAt: null },
    });
    const message = e instanceof Error ? e.message : "Error inesperado durante la reconstrucción";
    return Response.json({ error: message }, { status: 500 });
  }
}
