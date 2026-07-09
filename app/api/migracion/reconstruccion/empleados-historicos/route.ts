import { requireActiveAdminApi } from "@/lib/require-role";
import { createHistoricalEmployee } from "@/modules/migration/employee-lifecycle.service";
import { CreateHistoricalEmployeeInputSchema } from "@/types/api/migracion";

// Endpoint angosto: NO acepta role/email/password del cliente — se fijan
// server-side (role=EMPLEADO, isActive=false tras crear). Creación INMEDIATA,
// reutiliza UsersService.createEmployee()/setEmployeeActive() sin
// reimplementar esa lógica.
export async function POST(request: Request): Promise<Response> {
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const parsed = CreateHistoricalEmployeeInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Formato inválido" }, { status: 400 });
  }

  try {
    const employee = await createHistoricalEmployee(parsed.data.historicalName);
    return Response.json(employee, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo crear el empleado histórico";
    return Response.json({ error: message }, { status: 400 });
  }
}
