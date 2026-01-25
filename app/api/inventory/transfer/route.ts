import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";

// POST /api/inventory/transfer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transfer = await InventoryService.createTransfer(body);
    return NextResponse.json(transfer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
