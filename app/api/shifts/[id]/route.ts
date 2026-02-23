// ===== app/api/shifts/[id]/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ShiftsService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const shift = await ShiftsService.getShiftById(parseInt(id));
    return NextResponse.json(shift);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener corte";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
