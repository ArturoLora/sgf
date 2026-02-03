import { NextRequest, NextResponse } from "next/server";
import { ProductsService } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const productId = ProductsService.parseProductId(id);
    const product = await ProductsService.getProductById(productId);
    return NextResponse.json(product);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Producto no encontrado";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const productId = ProductsService.parseProductId(id);
    const body = await request.json();
    const serviceInput = ProductsService.parseUpdateProductInput(body);
    const product = await ProductsService.updateProduct(
      productId,
      serviceInput,
    );
    return NextResponse.json(product);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al actualizar producto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const productId = ProductsService.parseProductId(id);
    const product = await ProductsService.toggleProductStatus(productId);
    return NextResponse.json(product);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al cambiar estado del producto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
