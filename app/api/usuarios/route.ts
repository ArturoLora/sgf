import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersService } from "@/modules/users/users.service";
import { UsersQuerySchema } from "@/types/api/users";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
  }

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
