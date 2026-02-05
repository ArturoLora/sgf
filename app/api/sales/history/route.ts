import { NextRequest, NextResponse } from "next/server";
import { SalesService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const query = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      cashier: searchParams.get("cashier") || undefined,
      product: searchParams.get("product") || undefined,
      member: searchParams.get("member") || undefined,
      paymentMethod: searchParams.get("paymentMethod") || undefined,
      onlyActive: searchParams.get("onlyActive") || undefined,
      productType: searchParams.get("productType") || undefined,
      search: searchParams.get("search") || undefined,
      orderBy: searchParams.get("orderBy") || undefined,
      order: searchParams.get("order") || undefined,
      page: searchParams.get("page") || undefined,
      perPage: searchParams.get("perPage") || undefined,
    };

    const params = SalesService.parseSalesHistoryQuery(query);
    const result = await SalesService.getSalesHistory(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[sales/history]", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
