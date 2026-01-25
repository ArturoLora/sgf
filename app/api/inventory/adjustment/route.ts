import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services";

// POST /api/inventory/adjustment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const adjustment = await InventoryService.createAdjustment(body);
    return NextResponse.json(adjustment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
