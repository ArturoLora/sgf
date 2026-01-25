import { NextResponse } from "next/server";
import { MembersService } from "@/services";

// GET /api/members/expired
export async function GET() {
  try {
    const members = await MembersService.getExpiredMembers();
    return NextResponse.json(members);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
