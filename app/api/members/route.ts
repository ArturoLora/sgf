import { NextRequest, NextResponse } from "next/server";
import { MembersService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryRaw = {
      search: searchParams.get("search") || undefined,
      isActive: searchParams.get("isActive") || undefined,
      membershipType: searchParams.get("membershipType") || undefined,
    };

    const params = MembersService.parseMembersQuery(queryRaw);
    const members = await MembersService.getAllMembers(params);
    return NextResponse.json(members);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener socios";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const serviceInput = MembersService.parseCreateMemberInput(body);
    const member = await MembersService.createMember(
      serviceInput,
      session.user.id,
    );
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear socio";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
