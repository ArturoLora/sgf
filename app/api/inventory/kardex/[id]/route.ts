import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);

    const movements = await prisma.inventoryMovement.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        member: {
          select: {
            memberNumber: true,
            name: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    return NextResponse.json(serializeDecimal(movements));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
