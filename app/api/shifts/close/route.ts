import { NextRequest, NextResponse } from "next/server";
import { ShiftsService } from "@/services";

// POST /api/shifts/close
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const shift = await ShiftsService.closeShift(body);
    return NextResponse.json(shift);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
