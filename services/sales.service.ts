import { prisma } from "@/lib/db";
import { Prisma, PaymentMethod } from "@prisma/client";
import { serializeDecimal } from "./utils";
import { MEMBERSHIP_KEYWORDS } from "./membership-helpers";
import type {
  HistorialVentasResponse,
  ObtenerHistorialVentasQuery,
  ProductoVentaResponse,
  TicketVentaAgrupado,
} from "@/types/api/sales";

// ==================== TYPES ====================

interface SalesHistoryParams {
  startDate?: Date;
  endDate?: Date;
  cashier?: string;
  product?: number;
  member?: number;
  paymentMethod?: PaymentMethod;
  onlyActive?: boolean;
  productType?: "membresias" | "productos";
  search?: string;
  orderBy?: string;
  order?: "asc" | "desc";
  page: number;
  perPage: number;
}

interface TicketGroup {
  ticket: string;
  date: Date;
  total: number;
  paymentMethod: PaymentMethod | null;
  cashier: string;
  member: { memberNumber: string; name: string | null } | null;
  isCancelled: boolean;
  items: Array<{
    id: number;
    product: { name: string };
    quantity: number;
    total: import("@prisma/client/runtime/library").Decimal | null;
  }>;
}

// ==================== PARSING HELPERS ====================

export function parseSalesHistoryQuery(
  query: ObtenerHistorialVentasQuery,
): SalesHistoryParams {
  const page = parseInt(query.page || "1", 10);
  const perPage = parseInt(query.perPage || "10", 10);

  let paymentMethod: PaymentMethod | undefined;
  if (query.paymentMethod && query.paymentMethod !== "todos") {
    const validMethods: PaymentMethod[] = [
      "CASH",
      "DEBIT_CARD",
      "CREDIT_CARD",
      "TRANSFER",
    ];
    if (validMethods.includes(query.paymentMethod as PaymentMethod)) {
      paymentMethod = query.paymentMethod as PaymentMethod;
    }
  }

  return {
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
    cashier:
      query.cashier && query.cashier !== "todos" ? query.cashier : undefined,
    product:
      query.product && query.product !== "todos"
        ? parseInt(query.product, 10)
        : undefined,
    member:
      query.member && query.member !== "todos"
        ? parseInt(query.member, 10)
        : undefined,
    paymentMethod,
    onlyActive: query.onlyActive === "true",
    productType:
      query.productType && query.productType !== "todos"
        ? (query.productType as "membresias" | "productos")
        : undefined,
    search: query.search,
    orderBy: query.orderBy || "date",
    order: (query.order as "asc" | "desc") || "desc",
    page,
    perPage,
  };
}

// ==================== SALES HISTORY SERVICE ====================

export async function getSalesHistory(
  params: SalesHistoryParams,
): Promise<HistorialVentasResponse> {
  const where: Prisma.InventoryMovementWhereInput = {
    type: "SALE",
  };

  if (params.startDate && params.endDate) {
    where.date = {
      gte: params.startDate,
      lte: new Date(params.endDate.toISOString().split("T")[0] + "T23:59:59"),
    };
  }

  if (params.cashier) where.userId = params.cashier;
  if (params.product) where.productId = params.product;
  if (params.member) where.memberId = params.member;
  if (params.paymentMethod) where.paymentMethod = params.paymentMethod;
  if (params.onlyActive) where.isCancelled = false;

  if (params.productType) {
    if (params.productType === "membresias") {
      where.product = {
        OR: MEMBERSHIP_KEYWORDS.map((keyword) => ({
          name: { contains: keyword, mode: "insensitive" },
        })),
      };
    } else if (params.productType === "productos") {
      where.product = {
        NOT: {
          OR: MEMBERSHIP_KEYWORDS.map((keyword) => ({
            name: { contains: keyword, mode: "insensitive" },
          })),
        },
      };
    }
  }

  if (params.search) {
    where.OR = [
      { ticket: { contains: params.search, mode: "insensitive" } },
      { product: { name: { contains: params.search, mode: "insensitive" } } },
      { member: { name: { contains: params.search, mode: "insensitive" } } },
      {
        member: {
          memberNumber: { contains: params.search, mode: "insensitive" },
        },
      },
      { user: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  let orderByClause: Prisma.InventoryMovementOrderByWithRelationInput = {
    date: params.order,
  };

  if (params.orderBy === "total") {
    orderByClause = { total: params.order };
  } else if (params.orderBy === "ticket") {
    orderByClause = { ticket: params.order };
  }

  const uniqueTickets = await prisma.inventoryMovement.findMany({
    where,
    select: { ticket: true },
    distinct: ["ticket"],
  });

  const total = uniqueTickets.length;

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

  const groups = new Map<string, TicketGroup>();

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

    const g = groups.get(ticket)!;
    g.total += Number(m.total || 0);
    g.items.push({
      id: m.id,
      product: m.product,
      quantity: m.quantity,
      total: m.total,
    });
  }

  const ticketsArray = Array.from(groups.values());

  if (params.orderBy === "date") {
    ticketsArray.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return params.order === "desc" ? dateB - dateA : dateA - dateB;
    });
  } else if (params.orderBy === "total") {
    ticketsArray.sort((a, b) =>
      params.order === "desc" ? b.total - a.total : a.total - b.total,
    );
  } else if (params.orderBy === "ticket") {
    ticketsArray.sort((a, b) => {
      const ticketA = a.ticket || "";
      const ticketB = b.ticket || "";
      return params.order === "desc"
        ? ticketB.localeCompare(ticketA)
        : ticketA.localeCompare(ticketB);
    });
  }

  const skip = (params.page - 1) * params.perPage;
  const tickets = ticketsArray.slice(skip, skip + params.perPage);

  const serialized = serializeDecimal(tickets);

  return {
    tickets: serialized as TicketVentaAgrupado[],
    total,
    page: params.page,
    perPage: params.perPage,
    totalPages: Math.ceil(total / params.perPage),
  };
}

// ==================== SALE PRODUCTS SERVICE ====================

export async function getSaleProducts(): Promise<ProductoVentaResponse[]> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      NOT: {
        OR: MEMBERSHIP_KEYWORDS.map((keyword) => ({
          name: { contains: keyword, mode: "insensitive" },
        })),
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

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    salePrice: Number(p.salePrice),
    gymStock: p.gymStock,
    warehouseStock: p.warehouseStock,
    totalStock: p.gymStock + p.warehouseStock,
  }));
}
