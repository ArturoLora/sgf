import { NextResponse } from "next/server";
import { ReportsService } from "@/services";

// GET /api/inventory/report/stock
export async function GET() {
  try {
    const report = await ReportsService.getCurrentStockReport();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
