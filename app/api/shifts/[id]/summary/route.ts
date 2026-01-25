import { NextRequest, NextResponse } from "next/server";
import { ShiftsService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const summary = await ShiftsService.getSalesSummaryByShift(parseInt(id));
    return NextResponse.json({ productos: summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
