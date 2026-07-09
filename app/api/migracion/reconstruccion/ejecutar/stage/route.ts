import { requireActiveAdminApi } from "@/lib/require-role";
import { prisma } from "@/lib/db";
import { ShiftDetailSchema } from "@/types/api/migracion";
import { z } from "zod";

const KIND = "reconstruccion-ejecutar";

const StageBodySchema = z.object({
  importId: z.string().min(1),
  batchIndex: z.number().int().min(0),
  totalBatches: z.number().int().min(1),
  shifts: z.array(ShiftDetailSchema),
});

const TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

// Solo transporte/persistencia temporal — NUNCA borra DB, NUNCA ejecuta Reconstruction.
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

  const parsed = StageBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Formato de sub-batch inválido" }, { status: 400 });
  }
  const { importId, batchIndex, totalBatches, shifts } = parsed.data;

  if (batchIndex >= totalBatches) {
    return Response.json({ error: "batchIndex fuera de rango de totalBatches" }, { status: 400 });
  }

  // Aislamiento entre ADMINs: un importId ya usado por otro admin no puede
  // ser sobrescrito ni "adoptado" por la sesión actual.
  const existing = await prisma.migrationImportStaging.findUnique({
    where: { importId_kind_batchIndex: { importId, kind: KIND, batchIndex } },
    select: { adminUserId: true, claimedAt: true },
  });
  if (existing && existing.adminUserId !== adminUserId) {
    return Response.json({ error: "importId en uso por otra sesión" }, { status: 403 });
  }
  if (existing?.claimedAt) {
    return Response.json(
      { error: "Esta importación ya está siendo finalizada — no se puede modificar" },
      { status: 409 },
    );
  }

  // Barrido oportunista de filas abandonadas (>2h) — sin cron nuevo. Excluye
  // filas claimed (finalize en curso, aunque tarde más de 2h en completarse).
  await prisma.migrationImportStaging.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - TTL_MS) }, claimedAt: null },
  });

  // Upsert idempotente por (importId, kind, batchIndex) — reintento nunca
  // duplica, y `kind` en la clave evita mezclar Reconstruction con sync-shifts.
  await prisma.migrationImportStaging.upsert({
    where: { importId_kind_batchIndex: { importId, kind: KIND, batchIndex } },
    create: {
      importId,
      batchIndex,
      totalBatches,
      adminUserId,
      kind: KIND,
      shiftsJson: shifts,
    },
    update: {
      shiftsJson: shifts,
      totalBatches,
    },
  });

  return Response.json({ ok: true });
}
