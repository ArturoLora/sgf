/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ProductsService } from "@/services";

// GET /api/products - Lista todos los productos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const isActive = searchParams.get("isActive");
    const lowStock = searchParams.get("lowStock") === "true";

    const params = {
      search,
      isActive: isActive ? isActive === "true" : undefined,
      lowStock,
    };

    const products = await ProductsService.getAllProducts(params);
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/products - Crear producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product = await ProductsService.createProduct(body);
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
