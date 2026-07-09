import { requireActiveAdminApi } from "@/lib/require-role";
import { prisma } from "@/lib/db";
import { ShiftDetailSchema } from "@/types/api/migracion";
import { z } from "zod";

const StageBodySchema = z.object({
  importId: z.string().min(1),
  batchIndex: z.number().int().min(0),
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
  const { importId, batchIndex, shifts } = parsed.data;

  // Barrido oportunista de filas abandonadas (>2h) — sin cron nuevo.
  await prisma.migrationImportStaging.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - TTL_MS) } },
  });

  // Upsert idempotente por (importId, batchIndex) — reintento nunca duplica.
  await prisma.migrationImportStaging.upsert({
    where: { importId_batchIndex: { importId, batchIndex } },
    create: {
      importId,
      batchIndex,
      adminUserId,
      kind: "reconstruccion-ejecutar",
      shiftsJson: shifts,
    },
    update: {
      shiftsJson: shifts,
      adminUserId,
    },
  });

  return Response.json({ ok: true });
}
