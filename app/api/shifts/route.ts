import { NextRequest, NextResponse } from "next/server";
import { ShiftsService } from "@/services";

// GET /api/shifts - Lista todos los shifts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit");

    const shifts = await ShiftsService.getAllShifts(
      limit ? parseInt(limit) : undefined
    );
    return NextResponse.json(shifts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/shifts - Abrir shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const shift = await ShiftsService.openShift(body);
    return NextResponse.json(shift, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
