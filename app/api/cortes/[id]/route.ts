// app/api/cortes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CortesService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // ✅ Await params
    const corte = await CortesService.getCorteById(parseInt(id));
    return NextResponse.json(corte);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
