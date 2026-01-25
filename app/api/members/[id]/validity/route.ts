import { NextRequest, NextResponse } from "next/server";
import { MembersService } from "@/services";

// GET /api/members/[id]/validity
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

    const validity = await MembersService.verifyMembershipValidity(memberId);
    return NextResponse.json(validity);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Error al verificar vigencia" },
      { status: 400 }
    );
  }
}
