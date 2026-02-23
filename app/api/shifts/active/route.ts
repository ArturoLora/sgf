// ===== app/api/shifts/active/route.ts =====

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ShiftsService } from "@/services";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const shift = await ShiftsService.getActiveShift();

    if (!shift) {
      return NextResponse.json(
        { message: "No hay corte activo" },
        { status: 404 },
      );
    }

    return NextResponse.json(shift);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener corte activo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
