import { requireActiveAdminApi } from "@/lib/require-role";
import { getReconstructionPreview } from "@/modules/migration/reconstruction.service";

export async function GET(): Promise<Response> {
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;

  const preview = await getReconstructionPreview();
  return Response.json(preview);
}
