import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Construir filtros
    const where: any = {
      type: "SALE",
    };

    // Filtro de fechas
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59"),
      };
    }

    // Filtro de cajero
    const cashier = searchParams.get("cashier");
    if (cashier && cashier !== "todos") {
      where.userId = cashier;
    }

    // Filtro de producto
    const product = searchParams.get("product");
    if (product && product !== "todos") {
      where.productId = parseInt(product);
    }

    // Filtro de socio
    const member = searchParams.get("member");
    if (member && member !== "todos") {
      where.memberId = parseInt(member);
    }

    // Filtro de forma de pago
    const paymentMethod = searchParams.get("paymentMethod");
    if (paymentMethod && paymentMethod !== "todos") {
      where.paymentMethod = paymentMethod;
    }

    // Filtro de tipo de producto (membresías vs productos)
    const productType = searchParams.get("productType");
    if (productType && productType !== "todos") {
      // Obtener IDs de productos según tipo
      const keywordsMemberships = [
        "EFECTIVO",
        "VISITA",
        "MENSUALIDAD",
        "SEMANA",
        "TRIMESTRE",
        "ANUAL",
        "PROMOCION",
        "RENACER",
      ];

      const products = await prisma.product.findMany({
        select: { id: true, name: true },
      });

      if (productType === "membresias") {
        const membershipIds = products
          .filter((p) =>
            keywordsMemberships.some((k) => p.name.toUpperCase().includes(k)),
          )
          .map((p) => p.id);
        where.productId = { in: membershipIds };
      } else if (productType === "productos") {
        const productIds = products
          .filter(
            (p) =>
              !keywordsMemberships.some((k) =>
                p.name.toUpperCase().includes(k),
              ),
          )
          .map((p) => p.id);
        where.productId = { in: productIds };
      }
    }

    // Filtro de solo activas
    const onlyActive = searchParams.get("onlyActive") === "true";
    if (onlyActive) {
      where.isCancelled = false;
    }

    // Ordenamiento
    const orderBy = searchParams.get("orderBy") || "date";
    const order = searchParams.get("order") || "desc";

    const orderByClause: any = {};
    switch (orderBy) {
      case "total":
        orderByClause.total = order;
        break;
      case "ticket":
        orderByClause.ticket = order;
        break;
      default:
        orderByClause.date = order;
    }

    // Paginación
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "10");
    const skip = (page - 1) * perPage;

    // Contar total antes de aplicar skip/take
    const total = await prisma.inventoryMovement.count({ where });

    const sales = await prisma.inventoryMovement.findMany({
      where,
      include: {
        product: {
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
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: orderByClause,
      skip,
      take: perPage,
    });

    return NextResponse.json({
      sales: serializeDecimal(sales),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
