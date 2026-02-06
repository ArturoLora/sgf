// ===== app/api/shifts/[id]/summary/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { ShiftsService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
