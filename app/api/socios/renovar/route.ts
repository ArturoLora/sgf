import { NextRequest, NextResponse } from "next/server";
import { SociosService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const socio = await SociosService.renovarMembresia({
      ...body,
      userId: session.user.id,
    });

    return NextResponse.json(socio);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
