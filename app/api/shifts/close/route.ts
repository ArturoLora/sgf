// ===== app/api/shifts/close/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ShiftsService } from "@/services";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const input = ShiftsService.parseCloseShiftInput(body);
    const shift = await ShiftsService.closeShift(input);
    return NextResponse.json(shift);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cerrar corte";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
