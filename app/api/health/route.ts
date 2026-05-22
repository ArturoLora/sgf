import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ ok: true, commit, userCount });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ ok: false, commit, error: err.message }, { status: 500 });
  }
}
