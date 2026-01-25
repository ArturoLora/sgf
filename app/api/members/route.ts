import { NextRequest, NextResponse } from "next/server";
import { MembersService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// GET /api/members
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const isActive = searchParams.get("isActive");
    const membershipType = searchParams.get("membershipType") || undefined;

    const params = {
      search,
      isActive: isActive ? isActive === "true" : undefined,
      membershipType: membershipType as any,
    };

    const members = await MembersService.getAllMembers(params);
    return NextResponse.json(members);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/members
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const member = await MembersService.createMember({
      ...body,
      userId: session.user.id,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
