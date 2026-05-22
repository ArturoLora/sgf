// ===== app/api/shifts/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ShiftsService } from "@/services";
import { OpenShiftSchema } from "@/types/api/shifts";
import { Prisma } from "@/app/generated/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = OpenShiftSchema.parse(body);
    const shift = await ShiftsService.openShift(validated, session.user.id);

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    // P2002: folio unique constraint — ocurre si dos requests concurrentes pasan
    // las validaciones y ambas intentan crear un turno con el mismo folio.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un turno abierto. Recarga la página." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Error al abrir corte";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryRaw = {
      search: searchParams.get("search") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      cashier: searchParams.get("cashier") || undefined,
      status: searchParams.get("status") || undefined,
      orderBy: searchParams.get("orderBy") || undefined,
      order: searchParams.get("order") || undefined,
      page: searchParams.get("page") || undefined,
      perPage: searchParams.get("perPage") || undefined,
    };

    const params = ShiftsService.parseShiftsQuery(queryRaw);
    const result = await ShiftsService.getShifts(params);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener cortes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
