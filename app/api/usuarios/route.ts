import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersService } from "@/modules/users/users.service";
import { UsersQuerySchema } from "@/types/api/users";

async function requireAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Acceso restringido" }, { status: 403 }) };
  }

  return { error: null };
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const queryRaw = {
    search: searchParams.get("search") || undefined,
    role: searchParams.get("role") || undefined,
    isActive: searchParams.get("isActive") || undefined,
  };

  const queryValidated = UsersQuerySchema.parse(queryRaw);
  const params = UsersService.parseUsersQuery(queryValidated);
  const employees = await UsersService.listEmployees(params);
  return NextResponse.json(employees);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const body = await request.json();
    const input = UsersService.parseCreateEmployeeInput(body);
    const employee = await UsersService.createEmployee(input);
    return NextResponse.json(employee, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear empleado";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
