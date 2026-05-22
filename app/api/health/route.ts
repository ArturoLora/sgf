import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const dbUrl = process.env.DATABASE_URL ?? "(not set)";
  // Show scheme+host only — no credentials
  let dbHost = "(parse error)";
  try {
    const u = new URL(dbUrl);
    dbHost = `${u.protocol}//${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    dbHost = "unparseable";
  }

  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ ok: true, commit, userCount, dbHost });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ ok: false, commit, dbHost, error: err.message }, { status: 500 });
  }
}
