// ===== app/api/shifts/[id]/summary/route.ts =====

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
    const shiftId = ShiftsService.parseShiftIdParam(id);
    const summary = await ShiftsService.getShiftSummary(shiftId);
    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener resumen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
