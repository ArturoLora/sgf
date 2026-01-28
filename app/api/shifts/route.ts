import { NextRequest, NextResponse } from "next/server";
import { ShiftsService } from "@/services";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const shift = await ShiftsService.openShift({
      ...body,
      cashierId: session.user.id,
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Filtros
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const cashier = searchParams.get("cashier");
    const status = searchParams.get("status");

    // Ordenamiento
    const orderBy = searchParams.get("orderBy") || "fecha";
    const order = searchParams.get("order") || "desc";

    // Paginación
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "10");

    // Construir filtros
    const where: any = {};

    if (search) {
      where.folio = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (startDate && endDate) {
      where.openingDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (cashier) {
      where.cashierId = cashier;
    }

    if (status === "abiertos") {
      where.closingDate = null;
    } else if (status === "cerrados") {
      where.closingDate = { not: null };
    }

    // Ordenamiento
    const orderByField = orderBy === "folio" ? "folio" : "openingDate";
    const orderDirection = order === "asc" ? "asc" : "desc";

    // Contar total
    const total = await prisma.shift.count({ where });

    // Obtener shifts paginados
    const shifts = await prisma.shift.findMany({
      where,
      include: {
        cashier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        [orderByField]: orderDirection,
      },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return NextResponse.json({
      shifts: serializeDecimal(shifts),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
