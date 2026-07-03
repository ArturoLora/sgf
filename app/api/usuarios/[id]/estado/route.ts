import { NextRequest, NextResponse } from "next/server";
import { requireActiveAdminApi } from "@/lib/require-role";
import { UsersService } from "@/modules/users/users.service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID de empleado inválido" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const input = UsersService.parseSetEmployeeActiveInput(body);
    const { employee, sessionsRevoked } = await UsersService.setEmployeeActive(
      id,
      input.isActive,
    );
    return NextResponse.json({ ...employee, sessionsRevoked });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error al cambiar el estado del empleado";
    const status = message === "Empleado no encontrado" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
