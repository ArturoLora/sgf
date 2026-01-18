/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ProductosService } from "@/services";

// GET /api/productos/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productoId = parseInt(id);

    const producto = await ProductosService.getProductoById(productoId);
    return NextResponse.json(producto);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

// PATCH /api/productos/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productoId = parseInt(id);

    const body = await request.json();
    const producto = await ProductosService.updateProducto(productoId, body);

    return NextResponse.json(producto);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/productos/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productoId = parseInt(id);

    const producto = await ProductosService.toggleProductoStatus(productoId);
    return NextResponse.json(producto);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
