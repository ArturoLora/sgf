import { requireActiveAdminApi } from "@/lib/require-role";
import { MigrationService } from "@/modules/migration/migration.service";
import { MemberPreviewSchema } from "@/types/api/migracion";
import { rehydrateMemberDates } from "@/modules/migration/domain/upload-batching";
import { z } from "zod";

const BodySchema = z.object({
  members: z.array(MemberPreviewSchema),
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

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Formato de members inválido" }, { status: 400 });
  }

  const members = parsed.data.members.map(rehydrateMemberDates);
  const result = await MigrationService.syncMembers(members);
  return Response.json(result);
}
