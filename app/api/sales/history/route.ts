// app/api/sales/history/route.ts

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

    // ================= Filters =================

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59"),
      };
    }

    const cashier = searchParams.get("cashier");
    if (cashier && cashier !== "todos") where.userId = cashier;

    const product = searchParams.get("product");
    if (product && product !== "todos") where.productId = parseInt(product);

    const member = searchParams.get("member");
    if (member && member !== "todos") where.memberId = parseInt(member);

    const paymentMethod = searchParams.get("paymentMethod");
    if (paymentMethod && paymentMethod !== "todos")
      where.paymentMethod = paymentMethod as any;

    const onlyActive = searchParams.get("onlyActive") === "true";
    if (onlyActive) where.isCancelled = false;

    // Product type filter
    const productType = searchParams.get("productType");
    if (productType && productType !== "todos") {
      const membershipProducts = [
        "VISITA",
        "EFECTIVO SEMANA",
        "EFECTIVO MENSUALIDAD ESTUDIANTE",
        "EFECTIVO MENSUALIDAD GENERAL",
        "EFECTIVO TRIMESTRE ESTUDIANTE",
        "EFECTIVO TRIMESTRE GENERAL",
        "EFECTIVO ANUAL ESTUDIANTE",
        "EFECTIVO ANUAL GENERAL",
      ];

      if (productType === "membresias") {
        where.product = {
          name: { in: membershipProducts },
        };
      } else if (productType === "productos") {
        where.product = {
          name: { notIn: membershipProducts },
        };
      }
    }

    // Search filter
    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { ticket: { contains: search, mode: "insensitive" } },
        { product: { name: { contains: search, mode: "insensitive" } } },
        { member: { name: { contains: search, mode: "insensitive" } } },
        { member: { memberNumber: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // ================= Order By =================

    const orderBy = searchParams.get("orderBy") || "date";
    const order = searchParams.get("order") || "desc";

    let orderByClause: any = { date: order };

    if (orderBy === "total") {
      orderByClause = { total: order };
    } else if (orderBy === "ticket") {
      orderByClause = { ticket: order };
    }

    // ================= Pagination =================

    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "10");

    // ================= Get unique tickets count =================

    const uniqueTickets = await prisma.inventoryMovement.findMany({
      where,
      select: { ticket: true },
      distinct: ["ticket"],
    });

    const total = uniqueTickets.length;

    // ================= Get movements for current page =================

    // Get all movements, then group by ticket
    const movements = await prisma.inventoryMovement.findMany({
      where,
      orderBy: orderByClause,
      select: {
        id: true,
        ticket: true,
        date: true,
        quantity: true,
        total: true,
        paymentMethod: true,
        isCancelled: true,
        product: { select: { name: true } },
        member: { select: { memberNumber: true, name: true } },
        user: { select: { name: true } },
      },
    });

    // ================= Group by ticket =================

    const groups = new Map<string, any>();

    for (const m of movements) {
      const ticket = m.ticket || "NO-TICKET";

      if (!groups.has(ticket)) {
        groups.set(ticket, {
          ticket,
          date: m.date,
          total: 0,
          paymentMethod: m.paymentMethod,
          cashier: m.user.name,
          member: m.member,
          isCancelled: m.isCancelled,
          items: [],
        });
      }

      const g = groups.get(ticket);
      g.total += Number(m.total || 0);

      g.items.push({
        id: m.id,
        product: m.product,
        quantity: m.quantity,
        total: m.total,
      });
    }

    // Convert to array and apply ordering
    let ticketsArray = Array.from(groups.values());

    // Apply ordering to grouped tickets
    if (orderBy === "date") {
      ticketsArray.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return order === "desc" ? dateB - dateA : dateA - dateB;
      });
    } else if (orderBy === "total") {
      ticketsArray.sort((a, b) => {
        return order === "desc" ? b.total - a.total : a.total - b.total;
      });
    } else if (orderBy === "ticket") {
      ticketsArray.sort((a, b) => {
        const ticketA = a.ticket || "";
        const ticketB = b.ticket || "";
        return order === "desc"
          ? ticketB.localeCompare(ticketA)
          : ticketA.localeCompare(ticketB);
      });
    }

    // Apply pagination
    const skip = (page - 1) * perPage;
    const tickets = ticketsArray.slice(skip, skip + perPage);

    return NextResponse.json({
      tickets: serializeDecimal(tickets),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error: any) {
    console.error("[sales/history]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
