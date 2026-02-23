// ===== app/api/members/expired/route.ts =====

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MembersService } from "@/services";

// GET /api/members/expired
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const members = await MembersService.getExpiredMembers();
    return NextResponse.json(members);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al obtener socios vencidos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
