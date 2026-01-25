import { NextRequest, NextResponse } from "next/server";
import { ShiftsService } from "@/services";

// GET /api/shifts/active
export async function GET() {
  try {
    const shift = await ShiftsService.getActiveShift();

    if (!shift) {
      return NextResponse.json(
        { message: "No hay corte activo" },
        { status: 404 }
      );
    }

    return NextResponse.json(shift);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
