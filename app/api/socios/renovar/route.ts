import { NextRequest, NextResponse } from "next/server";
import { SociosService } from "@/services";

// POST /api/socios/renovar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const socio = await SociosService.renovarMembresia(body);
    return NextResponse.json(socio);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
