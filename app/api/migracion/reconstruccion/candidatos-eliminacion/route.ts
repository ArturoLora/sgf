import { requireActiveAdminApi } from "@/lib/require-role";
import { getDeletionCandidates } from "@/modules/migration/employee-lifecycle.service";
import { DeletionCandidatesRequestSchema } from "@/types/api/migracion";

// Solo Reconstruction. Cálculo SIEMPRE server-side — nunca confía en una
// lista de candidatos calculada en el cliente.
export async function POST(request: Request): Promise<Response> {
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const parsed = DeletionCandidatesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Formato inválido" }, { status: 400 });
  }

  const candidates = await getDeletionCandidates(parsed.data.employeeMapping);
  return Response.json(candidates);
}
