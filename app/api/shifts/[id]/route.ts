// ===== app/api/shifts/[id]/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { ShiftsService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const shift = await ShiftsService.getShiftById(parseInt(id));
    return NextResponse.json(shift);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener corte";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
