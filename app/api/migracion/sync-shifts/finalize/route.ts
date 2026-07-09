import { requireActiveAdminApi } from "@/lib/require-role";
import { prisma } from "@/lib/db";
import { MigrationService } from "@/modules/migration/migration.service";
import { EmployeeMappingSchema, ShiftDetailSchema } from "@/types/api/migracion";
import { rehydrateShiftDates, validateStagingCompleteness } from "@/modules/migration/domain/upload-batching";
import { z } from "zod";

const KIND = "sync-shifts";

const FinalizeBodySchema = z.object({
  importId: z.string().min(1),
  employeeMapping: EmployeeMappingSchema.optional().default({}),
});

// Reconstruye el conjunto GLOBAL de shifts desde staging y ejecuta
// syncShifts + finalizeSyncMode EXACTAMENTE UNA VEZ — sin cambios en
// ninguna de las dos funciones de negocio.
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
  const { importId, employeeMapping } = parsed.data;

  // Aislamiento: solo filas de este importId Y de este admin Y de este kind.
  const rows = await prisma.migrationImportStaging.findMany({
    where: { importId, adminUserId, kind: KIND },
    orderBy: { batchIndex: "asc" },
  });

  // Completitud: rechaza batches faltantes, discontinuos, fuera de rango, o
  // con totalBatches inconsistente ANTES de ejecutar cualquier lógica de negocio.
  const completeness = validateStagingCompleteness(rows);
  if (!completeness.ok) {
    return Response.json({ error: completeness.reason }, { status: 400 });
  }

  // Claim atómico: un solo UPDATE condicionado a claimedAt:null. Si dos
  // finalize concurrentes (doble click, retry del navegador) llegan casi
  // simultáneamente, solo uno afecta `rows.length` filas — el otro afecta 0
  // y debe rechazar sin ejecutar syncShifts/finalizeSyncMode.
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

    const syncResult = await MigrationService.syncShifts(shifts, employeeMapping);
    const finalize = await MigrationService.finalizeSyncMode(shifts, syncResult);

    // Cleanup en el camino feliz.
    await prisma.migrationImportStaging.deleteMany({ where: { importId, adminUserId, kind: KIND } });

    return Response.json({ ...syncResult, finalize });
  } catch (e) {
    // Libera el claim para permitir un retry legítimo — no se oculta el error.
    await prisma.migrationImportStaging.updateMany({
      where: { importId, adminUserId, kind: KIND },
      data: { claimedAt: null },
    });
    const message = e instanceof Error ? e.message : "Error inesperado durante la sincronización";
    return Response.json({ error: message }, { status: 500 });
  }
}
