import { requireActiveAdminApi } from "@/lib/require-role";
import { runDatabaseBackup } from "@/modules/migration/reconstruction.service";

export async function POST(): Promise<Response> {
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;

  try {
    const result = await runDatabaseBackup();
    return Response.json(result);
  } catch (e) {
    // AC6: a failed execution must never be reported as success.
    return Response.json(
      { error: e instanceof Error ? e.message : "No se pudo generar el respaldo" },
      { status: 500 },
    );
  }
}
