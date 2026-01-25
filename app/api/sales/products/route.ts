import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      // Solo productos físicos con stock
      // Excluir membresías basados en keywords
      NOT: {
        OR: [
          { name: { contains: "EFECTIVO", mode: "insensitive" } },
          { name: { contains: "VISITA", mode: "insensitive" } },
          { name: { contains: "MENSUALIDAD", mode: "insensitive" } },
          { name: { contains: "SEMANA", mode: "insensitive" } },
          { name: { contains: "TRIMESTRE", mode: "insensitive" } },
          { name: { contains: "ANUAL", mode: "insensitive" } },
        ],
      },
    },
    select: {
      id: true,
      name: true,
      salePrice: true,
      gymStock: true,
      warehouseStock: true,
    },
    orderBy: { name: "asc" },
  });

  // Agregar campo calculado de stock total
  const productsWithStock = products.map(p => ({
    ...p,
    totalStock: p.gymStock + p.warehouseStock,
  }));

  return NextResponse.json(productsWithStock);
}
