import { NextRequest, NextResponse } from "next/server";
import { MembersService } from "@/services";

// GET /api/members/[id]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const memberId = Number(id);

    if (isNaN(memberId)) {
      return NextResponse.json(
        { error: "ID de socio inválido" },
        { status: 400 }
      );
    }

    const member = await MembersService.getMemberById(memberId);
    return NextResponse.json(member);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Socio no encontrado" },
      { status: 404 }
    );
  }
}

// PATCH /api/members/[id]
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const memberId = Number(id);

    if (isNaN(memberId)) {
      return NextResponse.json(
        { error: "ID de socio inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const member = await MembersService.updateMember(memberId, body);

    return NextResponse.json(member);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Error al actualizar socio" },
      { status: 400 }
    );
  }
}

// DELETE /api/members/[id]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const memberId = Number(id);

    if (isNaN(memberId)) {
      return NextResponse.json(
        { error: "ID de socio inválido" },
        { status: 400 }
      );
    }

    const member = await MembersService.toggleMemberStatus(memberId);
    return NextResponse.json(member);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Error al cambiar estado del socio" },
      { status: 400 }
    );
  }
}
