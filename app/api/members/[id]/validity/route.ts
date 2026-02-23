// ===== app/api/members/[id]/validity/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MembersService } from "@/services";

// GET /api/members/[id]/validity
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const memberId = Number(id);

    if (isNaN(memberId)) {
      return NextResponse.json(
        { error: "ID de socio inválido" },
        { status: 400 },
      );
    }

    const validity = await MembersService.verifyMembershipValidity(memberId);
    return NextResponse.json(validity);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al verificar vigencia";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
