import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const productos = await prisma.producto.findMany({
    where: {
      activo: true,
      esMembresia: false, // Solo productos físicos con stock
    },
    select: {
      id: true,
      nombre: true,
      precio: true,
      stockGym: true,
      stockBodega: true,
    },
    orderBy: { nombre: "asc" },
  });

  // Agregar campo calculado de stock total
  const productosConStock = productos.map(p => ({
    ...p,
    stockTotal: p.stockGym + p.stockBodega,
  }));

  return NextResponse.json(productosConStock);
}
