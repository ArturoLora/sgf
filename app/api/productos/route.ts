/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ProductosService } from "@/services";

// GET /api/productos - Lista todos los productos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const activo = searchParams.get("activo");
    const bajoStock = searchParams.get("bajoStock") === "true";

    const params = {
      search,
      activo: activo ? activo === "true" : undefined,
      bajoStock,
    };

    const productos = await ProductosService.getAllProductos(params);
    return NextResponse.json(productos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/productos - Crear producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const producto = await ProductosService.createProducto(body);
    return NextResponse.json(producto, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
