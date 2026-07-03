import { requireActiveAdminApi } from "@/lib/require-role";
import { MigrationService } from "@/modules/migration/migration.service";
import { EmployeeMappingSchema } from "@/types/api/migracion";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request): Promise<Response> {
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const rawFiles = formData.getAll("files") as File[];
  if (rawFiles.length === 0) {
    return Response.json({ error: "No se recibieron archivos" }, { status: 400 });
  }

  for (const file of rawFiles) {
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `El archivo "${file.name}" excede el límite de 10 MB` },
        { status: 400 },
      );
    }
  }

  const rawMapping = formData.get("employeeMapping");
  let employeeMapping: Record<string, string> = {};
  if (typeof rawMapping === "string" && rawMapping.length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawMapping);
    } catch {
      return Response.json({ error: "employeeMapping no es JSON válido" }, { status: 400 });
    }
    const result = EmployeeMappingSchema.safeParse(parsed);
    if (!result.success) {
      return Response.json({ error: "employeeMapping tiene un formato inválido" }, { status: 400 });
    }
    employeeMapping = result.data;
  }

  const files = await Promise.all(
    rawFiles.map(async (file) => ({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    })),
  );

  const preview = await MigrationService.previewFiles(files);
  const result = await MigrationService.syncShifts(preview.shifts, employeeMapping);
  // Finalization (gymStock, max ticket, consistency checks) must run in this
  // same request — the "Exi Actual" snapshot only exists in preview.shifts,
  // never persisted (Story 1.6, H8).
  const finalize = await MigrationService.finalizeSyncMode(preview.shifts, result);
  return Response.json({ ...result, finalize });
}
