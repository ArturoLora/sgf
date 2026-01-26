// app/api/shifts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ShiftsService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // ✅ Usar el ID del usuario autenticado
    const shift = await ShiftsService.openShift({
      ...body,
      cashierId: session.user.id, // Tomar del usuario logueado
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
// GET /api/shifts - Lista todos los shifts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit");

    const shifts = await ShiftsService.getAllShifts(
      limit ? parseInt(limit) : undefined,
    );
    return NextResponse.json(shifts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
