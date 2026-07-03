import { NextRequest, NextResponse } from "next/server";
import { requireActiveAdminApi } from "@/lib/require-role";
import { UsersService } from "@/modules/users/users.service";
import { UsersQuerySchema } from "@/types/api/users";

export async function GET(request: NextRequest) {
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;

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
  const check = await requireActiveAdminApi();
  if ("errorResponse" in check) return check.errorResponse;

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
