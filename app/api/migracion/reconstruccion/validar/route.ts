import { requireActiveAdminApi } from "@/lib/require-role";
import { validateReconstruction } from "@/modules/migration/reconstruction.service";
import { z } from "zod";

const RequestSchema = z.object({
  expectedMembers: z.number().int().nonnegative(),
  expectedShifts: z.number().int().nonnegative(),
  consistencyWarningCount: z.number().int().nonnegative(),
});

export async function POST(request: Request): Promise<Response> {
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const result = await validateReconstruction(
    parsed.data.expectedMembers,
    parsed.data.expectedShifts,
    parsed.data.consistencyWarningCount,
  );
  return Response.json(result);
}
