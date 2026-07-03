import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersService } from "@/modules/users/users.service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (adminUser?.role !== "ADMIN") {
    return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID de empleado inválido" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const input = UsersService.parseUpdateEmployeeInput(body);
    const employee = await UsersService.updateEmployee(id, input);
    return NextResponse.json(employee);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al editar empleado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
