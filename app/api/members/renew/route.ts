import { NextRequest, NextResponse } from "next/server";
import { MembersService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const serviceInput = MembersService.parseRenewMemberInput(body);
    const member = await MembersService.renewMembership(
      serviceInput,
      session.user.id,
    );
    return NextResponse.json(member);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al renovar membresía";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
