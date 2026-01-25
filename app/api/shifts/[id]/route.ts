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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
