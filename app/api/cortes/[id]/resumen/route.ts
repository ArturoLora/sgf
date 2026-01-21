// app/api/cortes/[id]/resumen/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CortesService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // ✅ Await params
    const resumen = await CortesService.getResumenVentasCorte(parseInt(id));
    return NextResponse.json({ productos: resumen });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
