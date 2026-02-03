import { NextRequest, NextResponse } from "next/server";
import { ProductsService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryRaw = {
      search: searchParams.get("search") || undefined,
      isActive: searchParams.get("isActive") || undefined,
      lowStock: searchParams.get("lowStock") || undefined,
    };

    const params = ProductsService.parseProductsQuery(queryRaw);
    const products = await ProductsService.getAllProducts(params);
    return NextResponse.json(products);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener productos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const serviceInput = ProductsService.parseCreateProductInput(body);
    const product = await ProductsService.createProduct(serviceInput);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear producto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
