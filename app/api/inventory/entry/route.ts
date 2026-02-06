// ===== app/api/inventory/entry/route.ts =====

import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const entry = await InventoryService.createEntry(body, session.user.id);
    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al crear entrada";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
