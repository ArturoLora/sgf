import { requireActiveAdminApi } from "@/lib/require-role";
import { prisma } from "@/lib/db";
import { executeReconstruction } from "@/modules/migration/reconstruction.service";
import { EmployeeMappingSchema, MemberPreviewSchema, ShiftDetailSchema } from "@/types/api/migracion";
import { rehydrateMemberDates, rehydrateShiftDates } from "@/modules/migration/domain/upload-batching";
import { z } from "zod";

const FinalizeBodySchema = z.object({
  importId: z.string().min(1),
  members: z.array(MemberPreviewSchema),
  employeeMapping: EmployeeMappingSchema.optional().default({}),
  reimportProducts: z.boolean().default(false),
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

  // Aislamiento: solo filas de este importId Y de este admin.
  const rows = await prisma.migrationImportStaging.findMany({
    where: { importId, adminUserId, kind: "reconstruccion-ejecutar" },
    orderBy: { batchIndex: "asc" },
  });

  if (rows.length === 0) {
    return Response.json(
      { error: "No hay datos en staging para este importId — reinicia la importación" },
      { status: 400 },
    );
  }

  const rawShifts = rows.flatMap((row) => {
    const result = z.array(ShiftDetailSchema).safeParse(row.shiftsJson);
    return result.success ? result.data : [];
  });

  const shifts = rawShifts.map(rehydrateShiftDates);
  const members = parsed.data.members.map(rehydrateMemberDates);

  const result = await executeReconstruction(members, shifts, employeeMapping, reimportProducts);

  // Cleanup en el camino feliz.
  await prisma.migrationImportStaging.deleteMany({
    where: { importId, adminUserId, kind: "reconstruccion-ejecutar" },
  });

  return Response.json(result);
}
