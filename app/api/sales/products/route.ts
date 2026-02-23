// ===== app/api/sales/products/route.ts =====

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProductsService } from "@/services";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const products = await ProductsService.getSaleProducts();
    return NextResponse.json(products);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener productos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
