import { NextResponse } from "next/server";
import { ShiftsService } from "@/services";

export async function GET() {
  try {
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
