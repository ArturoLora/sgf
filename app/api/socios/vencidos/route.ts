import { NextResponse } from "next/server";
import { SociosService } from "@/services";

// GET /api/socios/vencidos
export async function GET() {
  try {
    const socios = await SociosService.getSociosVencidos();
    return NextResponse.json(socios);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
