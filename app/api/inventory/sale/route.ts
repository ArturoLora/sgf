import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// POST /api/inventory/sale
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const sale = await InventoryService.createSale({
      ...body,
      userId: session.user.id,
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
