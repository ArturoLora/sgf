// ===== app/api/members/[id]/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MembersService } from "@/services";

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

    const member = await MembersService.getMemberById(memberId);
    return NextResponse.json(member);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Socio no encontrado";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
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

    const body = await request.json();
    const serviceInput = MembersService.parseUpdateMemberInput(body);
    const member = await MembersService.updateMember(memberId, serviceInput);
    return NextResponse.json(member);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al actualizar socio";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
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

    const member = await MembersService.toggleMemberStatus(memberId);
    return NextResponse.json(member);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al cambiar estado del socio";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
