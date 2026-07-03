import { requireActiveAdminApi } from "@/lib/require-role";
import { MigrationService } from "@/modules/migration/migration.service";

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

  const files = await Promise.all(
    rawFiles.map(async (file) => ({
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    })),
  );

  const preview = await MigrationService.previewFiles(files);
  const result = await MigrationService.syncMembers(preview.members);
  return Response.json(result);
}
