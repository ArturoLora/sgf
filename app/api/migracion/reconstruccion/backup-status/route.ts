import { requireActiveAdminApi } from "@/lib/require-role";
import { checkPgDumpAvailability } from "@/modules/migration/reconstruction.service";

export async function GET(): Promise<Response> {
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;

  const availability = await checkPgDumpAvailability();
  return Response.json(availability);
}
