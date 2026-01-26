import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeDecimal } from "@/services/utils";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const where: Prisma.InventoryMovementWhereInput = {
      type: "SALE",
    };

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59"),
      };
    }

    const cashier = searchParams.get("cashier");
    if (cashier && cashier !== "todos") {
      where.userId = cashier;
    }

    const product = searchParams.get("product");
    if (product && product !== "todos") {
      where.productId = parseInt(product);
    }

    const member = searchParams.get("member");
    if (member && member !== "todos") {
      where.memberId = parseInt(member);
    }

    const paymentMethod = searchParams.get("paymentMethod");
    if (paymentMethod && paymentMethod !== "todos") {
      where.paymentMethod = paymentMethod;
    }

    const productType = searchParams.get("productType");

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

    if (productType && productType !== "todos") {
      if (productType === "membresias") {
        where.product = {
          OR: keywordsMemberships.map((k) => ({
            name: { contains: k, mode: "insensitive" },
          })),
        };
      }

      if (productType === "productos") {
        where.NOT = {
          product: {
            OR: keywordsMemberships.map((k) => ({
              name: { contains: k, mode: "insensitive" },
            })),
          },
        };
      }
    }

    const onlyActive = searchParams.get("onlyActive") === "true";
    if (onlyActive) {
      where.isCancelled = false;
    }

    const orderBy = searchParams.get("orderBy") || "date";
    const order = searchParams.get("order") || "desc";

    const orderByClause: Prisma.InventoryMovementOrderByWithRelationInput = {};

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

    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "10");
    const skip = (page - 1) * perPage;

    const [total, sales] = await Promise.all([
      prisma.inventoryMovement.count({ where }),
      prisma.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { name: true } },
          member: { select: { memberNumber: true, name: true } },
          user: { select: { name: true } },
        },
        orderBy: orderByClause,
        skip,
        take: perPage,
      }),
    ]);

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
