/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ProductsService } from "@/services";

// GET /api/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);

    const product = await ProductsService.getProductById(productId);
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

// PATCH /api/products/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);

    const body = await request.json();
    const product = await ProductsService.updateProduct(productId, body);

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);

    const product = await ProductsService.toggleProductStatus(productId);
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
