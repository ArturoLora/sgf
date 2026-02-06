import { prisma } from "@/lib/db";
import { InventoryType, Location, PaymentMethod } from "@prisma/client";
import { calculateMembershipDates, parseISODate, parseIntParam } from "./utils";
import {
  mapLocation,
  mapPaymentMethod,
  mapInventoryTypeToKardex,
} from "./enum-mappers";
import { isMembershipProduct } from "./membership-helpers";
import {
  MovementsQuerySchema,
  CancelledSalesQuerySchema,
} from "@/types/api/inventory";
import type {
  CrearVentaRequest,
  CrearEntradaRequest,
  CrearTraspasoRequest,
  CrearAjusteRequest,
  CancelarVentaRequest,
  MovimientoInventarioResponse,
  VentaResponse,
  EntradaResponse,
  TraspasoResponse,
  AjusteResponse,
  KardexMovimientoResponse,
  MovementsQueryInput,
  CancelledSalesQueryInput,
} from "@/types/api/inventory";
import type { DetalleTicketResponse, ItemVentaTicket } from "@/types/api/sales";

// ==================== INTERNAL TYPES ====================

export interface GetMovementsByDateParams {
  startDate: Date;
  endDate: Date;
}

export interface GetCancelledSalesParams {
  startDate?: Date;
  endDate?: Date;
}

interface KardexPrismaRow {
  id: number;
  type: InventoryType;
  location: Location;
  quantity: number;
  ticket: string | null;
  unitPrice: import("@prisma/client/runtime/library").Decimal | null;
  total: import("@prisma/client/runtime/library").Decimal | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  isCancelled: boolean;
  date: Date;
  user: {
    name: string;
  };
  member: {
    memberNumber: string;
    name: string | null;
  } | null;
}

// ==================== HELPERS ====================

function serializeVenta(movement: {
  id: number;
  productId: number;
  type: InventoryType;
  location: Location;
  quantity: number;
  ticket: string | null;
  memberId: number | null;
  userId: string;
  unitPrice: import("@prisma/client/runtime/library").Decimal | null;
  subtotal: import("@prisma/client/runtime/library").Decimal | null;
  discount: import("@prisma/client/runtime/library").Decimal | null;
  surcharge: import("@prisma/client/runtime/library").Decimal | null;
  total: import("@prisma/client/runtime/library").Decimal | null;
  paymentMethod: PaymentMethod | null;
  shiftId: number | null;
  notes: string | null;
  isCancelled: boolean;
  cancellationReason: string | null;
  cancellationDate: Date | null;
  date: Date;
  createdAt: Date;
  product: {
    name: string;
    salePrice?: import("@prisma/client/runtime/library").Decimal;
  };
  member?: { memberNumber: string; name: string | null } | null;
  user: { name: string };
}): VentaResponse {
  if (!movement.ticket) {
    throw new Error("Sale movement missing required ticket");
  }
  if (movement.unitPrice === null) {
    throw new Error("Sale movement missing required unitPrice");
  }
  if (movement.subtotal === null) {
    throw new Error("Sale movement missing required subtotal");
  }
  if (movement.total === null) {
    throw new Error("Sale movement missing required total");
  }
  if (!movement.paymentMethod) {
    throw new Error("Sale movement missing required paymentMethod");
  }

  return {
    id: movement.id,
    productId: movement.productId,
    type: "SALE",
    location: "GYM",
    quantity: movement.quantity,
    ticket: movement.ticket,
    userId: movement.userId,
    unitPrice: Number(movement.unitPrice),
    subtotal: Number(movement.subtotal),
    discount: Number(movement.discount || 0),
    surcharge: Number(movement.surcharge || 0),
    total: Number(movement.total),
    paymentMethod: mapPaymentMethod(movement.paymentMethod),
    memberId: movement.memberId ?? undefined,
    shiftId: movement.shiftId ?? undefined,
    notes: movement.notes ?? undefined,
    isCancelled: movement.isCancelled,
    cancellationReason: movement.cancellationReason ?? undefined,
    cancellationDate: movement.cancellationDate ?? undefined,
    date: movement.date,
    createdAt: movement.createdAt,
    product: {
      name: movement.product.name,
      salePrice: movement.product.salePrice
        ? Number(movement.product.salePrice)
        : undefined,
    },
    member: movement.member
      ? {
          memberNumber: movement.member.memberNumber,
          name: movement.member.name ?? undefined,
        }
      : undefined,
    user: {
      name: movement.user.name,
    },
  };
}

function serializeEntrada(movement: {
  id: number;
  productId: number;
  type: InventoryType;
  location: Location;
  quantity: number;
  userId: string;
  notes: string | null;
  date: Date;
  createdAt: Date;
  product: { name: string };
  user: { name: string };
}): EntradaResponse {
  return {
    id: movement.id,
    productId: movement.productId,
    type: "ENTRY",
    location: mapLocation(movement.location),
    quantity: movement.quantity,
    userId: movement.userId,
    notes: movement.notes ?? undefined,
    date: movement.date,
    createdAt: movement.createdAt,
    product: {
      name: movement.product.name,
    },
    user: {
      name: movement.user.name,
    },
  };
}

function serializeTraspaso(movement: {
  id: number;
  productId: number;
  type: InventoryType;
  location: Location;
  quantity: number;
  userId: string;
  notes: string | null;
  date: Date;
  createdAt: Date;
  product: { name: string };
  user: { name: string };
}): TraspasoResponse {
  if (!movement.notes) {
    throw new Error("Transfer movement missing required notes");
  }

  return {
    id: movement.id,
    productId: movement.productId,
    type: "TRANSFER",
    location: mapLocation(movement.location),
    quantity: movement.quantity,
    userId: movement.userId,
    notes: movement.notes,
    date: movement.date,
    createdAt: movement.createdAt,
    product: {
      name: movement.product.name,
    },
    user: {
      name: movement.user.name,
    },
  };
}

function serializeAjuste(movement: {
  id: number;
  productId: number;
  type: InventoryType;
  location: Location;
  quantity: number;
  userId: string;
  notes: string | null;
  date: Date;
  createdAt: Date;
  product: { name: string };
  user: { name: string };
}): AjusteResponse {
  if (!movement.notes) {
    throw new Error("Adjustment movement missing required notes");
  }

  return {
    id: movement.id,
    productId: movement.productId,
    type: "ADJUSTMENT",
    location: mapLocation(movement.location),
    quantity: movement.quantity,
    userId: movement.userId,
    notes: movement.notes,
    date: movement.date,
    createdAt: movement.createdAt,
    product: {
      name: movement.product.name,
    },
    user: {
      name: movement.user.name,
    },
  };
}

function serializeInventoryMovement(movement: {
  id: number;
  productId: number;
  type: InventoryType;
  location: Location;
  quantity: number;
  ticket: string | null;
  memberId: number | null;
  userId: string;
  unitPrice: import("@prisma/client/runtime/library").Decimal | null;
  subtotal: import("@prisma/client/runtime/library").Decimal | null;
  discount: import("@prisma/client/runtime/library").Decimal | null;
  surcharge: import("@prisma/client/runtime/library").Decimal | null;
  total: import("@prisma/client/runtime/library").Decimal | null;
  paymentMethod: PaymentMethod | null;
  shiftId: number | null;
  notes: string | null;
  isCancelled: boolean;
  cancellationReason: string | null;
  cancellationDate: Date | null;
  date: Date;
  createdAt: Date;
  product: {
    name: string;
    salePrice?: import("@prisma/client/runtime/library").Decimal;
  };
  member?: { memberNumber: string; name: string | null } | null;
  user: { name: string };
}): MovimientoInventarioResponse {
  if (movement.type === "SALE") {
    return serializeVenta(movement);
  } else if (
    movement.type === "WAREHOUSE_ENTRY" ||
    movement.type === "GYM_ENTRY"
  ) {
    return serializeEntrada(movement);
  } else if (
    movement.type === "TRANSFER_TO_GYM" ||
    movement.type === "TRANSFER_TO_WAREHOUSE"
  ) {
    return serializeTraspaso(movement);
  } else if (movement.type === "ADJUSTMENT") {
    return serializeAjuste(movement);
  }

  throw new Error(`Unknown movement type: ${movement.type}`);
}

// ==================== KARDEX SERIALIZER ====================

function serializeKardexMovement(
  row: KardexPrismaRow,
  balance: number,
): KardexMovimientoResponse {
  return {
    id: row.id,
    type: mapInventoryTypeToKardex(row.type),
    location: mapLocation(row.location),
    quantity: row.quantity,
    balance,
    ticket: row.ticket ?? undefined,
    unitPrice: row.unitPrice !== null ? Number(row.unitPrice) : undefined,
    total: row.total !== null ? Number(row.total) : undefined,
    paymentMethod: row.paymentMethod
      ? mapPaymentMethod(row.paymentMethod)
      : undefined,
    notes: row.notes ?? undefined,
    isCancelled: row.isCancelled,
    date: row.date,
    user: {
      name: row.user.name,
    },
    member: row.member
      ? {
          memberNumber: row.member.memberNumber,
          name: row.member.name ?? undefined,
        }
      : undefined,
  };
}

// ==================== VALIDATIONS ====================

async function validateStock(
  productId: number,
  quantity: number,
  location: Location,
): Promise<{
  id: number;
  name: string;
  warehouseStock: number;
  gymStock: number;
  salePrice: import("@prisma/client/runtime/library").Decimal;
}> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const isMembership = isMembershipProduct(product.name);

  if (!isMembership) {
    const currentStock =
      location === "WAREHOUSE" ? product.warehouseStock : product.gymStock;

    if (currentStock < quantity) {
      throw new Error(
        `Stock insuficiente en ${location}. Disponible: ${currentStock}, Solicitado: ${quantity}`,
      );
    }
  }

  return product;
}

// ==================== PARSING HELPERS ====================

export function parseMovementsQuery(
  raw: MovementsQueryInput,
): GetMovementsByDateParams {
  const validated = MovementsQuerySchema.parse(raw);

  const startDate = new Date(validated.startDate);
  const endDate = new Date(validated.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Fechas inválidas");
  }

  return { startDate, endDate };
}

export function parseCancelledSalesQuery(
  raw: CancelledSalesQueryInput,
): GetCancelledSalesParams {
  const validated = CancelledSalesQuerySchema.parse(raw);

  return {
    startDate: parseISODate(validated.startDate),
    endDate: parseISODate(validated.endDate),
  };
}

export function parseProductIdParam(id: string): number {
  return parseIntParam(id, "ID de producto");
}

// ==================== SALE SERVICES ====================

export async function createSale(
  data: CrearVentaRequest,
  userId: string,
): Promise<VentaResponse> {
  const product = await validateStock(data.productId, data.quantity, "GYM");

  const unitPrice = data.unitPrice || Number(product.salePrice);
  const subtotal = unitPrice * data.quantity;
  const discount = data.discount || 0;
  const surcharge = data.surcharge || 0;
  const total = subtotal - discount + surcharge;

  const isMembership = isMembershipProduct(product.name);

  const inventoryMovement = await prisma.$transaction(async (tx) => {
    const movement = await tx.inventoryMovement.create({
      data: {
        productId: data.productId,
        type: "SALE",
        location: "GYM",
        quantity: -data.quantity,
        ticket: data.ticket,
        memberId: data.memberId,
        userId,
        unitPrice,
        subtotal,
        discount,
        surcharge,
        total,
        paymentMethod: data.paymentMethod,
        shiftId: data.shiftId,
        notes: data.notes,
      },
      include: {
        product: true,
        member: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!isMembership) {
      await tx.product.update({
        where: { id: data.productId },
        data: {
          gymStock: product.gymStock - data.quantity,
        },
      });
    }

    return movement;
  });

  if (data.memberId && isMembership) {
    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
    });

    if (member && member.membershipType) {
      const dates = calculateMembershipDates(member.membershipType);

      await prisma.member.update({
        where: { id: data.memberId },
        data: {
          startDate: dates.startDate,
          endDate: dates.endDate,
          totalVisits: { increment: 1 },
          lastVisit: new Date(),
        },
      });
    }
  } else if (data.memberId) {
    await prisma.member.update({
      where: { id: data.memberId },
      data: {
        totalVisits: { increment: 1 },
        lastVisit: new Date(),
      },
    });
  }

  return serializeVenta(inventoryMovement);
}

export async function cancelSale(
  data: CancelarVentaRequest,
): Promise<VentaResponse> {
  const sale = await prisma.inventoryMovement.findUnique({
    where: { id: data.inventoryId },
    include: {
      product: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!sale) {
    throw new Error("Venta no encontrada");
  }

  if (sale.type !== "SALE") {
    throw new Error("Solo se pueden cancelar ventas");
  }

  if (sale.isCancelled) {
    throw new Error("La venta ya fue cancelada");
  }

  const quantityToReturn = Math.abs(sale.quantity);

  const cancelledInventory = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.inventoryMovement.update({
      where: { id: data.inventoryId },
      data: {
        isCancelled: true,
        cancellationReason: data.cancellationReason,
        cancellationDate: new Date(),
      },
      include: {
        product: true,
        member: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    await tx.product.update({
      where: { id: sale.productId },
      data: {
        gymStock: sale.product.gymStock + quantityToReturn,
      },
    });

    return cancelled;
  });

  return serializeVenta(cancelledInventory);
}

// ==================== TICKET SERVICES ====================

export async function getTicketDetail(
  ticket: string,
): Promise<DetalleTicketResponse> {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      ticket,
      type: "SALE",
    },
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
    orderBy: { date: "asc" },
  });

  if (sales.length === 0) {
    throw new Error("Ticket no encontrado");
  }

  const firstSale = sales[0];

  const items: ItemVentaTicket[] = sales.map((s) => ({
    id: s.id,
    product: {
      name: s.product.name,
    },
    quantity: s.quantity,
    total: Number(s.total || 0),
  }));

  const total = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);

  return {
    ticket,
    date: firstSale.date,
    cashier: firstSale.user.name,
    paymentMethod: firstSale.paymentMethod
      ? mapPaymentMethod(firstSale.paymentMethod)
      : undefined,
    member: firstSale.member
      ? {
          memberNumber: firstSale.member.memberNumber,
          name: firstSale.member.name ?? undefined,
        }
      : undefined,
    isCancelled: firstSale.isCancelled,
    cancellationReason: firstSale.cancellationReason ?? undefined,
    cancellationDate: firstSale.cancellationDate ?? undefined,
    notes: firstSale.notes ?? undefined,
    total,
    items,
  };
}

// ==================== ENTRY SERVICES ====================

export async function createEntry(
  data: CrearEntradaRequest,
  userId: string,
): Promise<EntradaResponse> {
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const type: InventoryType =
    data.location === "WAREHOUSE" ? "WAREHOUSE_ENTRY" : "GYM_ENTRY";

  const inventoryMovement = await prisma.$transaction(async (tx) => {
    const movement = await tx.inventoryMovement.create({
      data: {
        productId: data.productId,
        type,
        location: data.location,
        quantity: data.quantity,
        userId,
        notes: data.notes,
      },
      include: {
        product: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    await tx.product.update({
      where: { id: data.productId },
      data: {
        [data.location === "WAREHOUSE" ? "warehouseStock" : "gymStock"]: {
          increment: data.quantity,
        },
      },
    });

    return movement;
  });

  return serializeEntrada(inventoryMovement);
}

// ==================== TRANSFER SERVICES ====================

export async function createTransfer(
  data: CrearTraspasoRequest,
  userId: string,
): Promise<TraspasoResponse> {
  const origin: Location = data.destination === "GYM" ? "WAREHOUSE" : "GYM";

  const product = await validateStock(data.productId, data.quantity, origin);

  const type: InventoryType =
    data.destination === "GYM" ? "TRANSFER_TO_GYM" : "TRANSFER_TO_WAREHOUSE";

  const inventoryMovement = await prisma.$transaction(async (tx) => {
    const movement = await tx.inventoryMovement.create({
      data: {
        productId: data.productId,
        type,
        location: data.destination,
        quantity: data.quantity,
        userId,
        notes:
          data.notes ||
          `Traspaso de ${data.quantity} unidades de ${origin} a ${data.destination}`,
      },
      include: {
        product: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    await tx.product.update({
      where: { id: data.productId },
      data: {
        warehouseStock:
          origin === "WAREHOUSE"
            ? product.warehouseStock - data.quantity
            : product.warehouseStock + data.quantity,
        gymStock:
          origin === "GYM"
            ? product.gymStock - data.quantity
            : product.gymStock + data.quantity,
      },
    });

    return movement;
  });

  return serializeTraspaso(inventoryMovement);
}

// ==================== ADJUSTMENT SERVICES ====================

export async function createAdjustment(
  data: CrearAjusteRequest,
  userId: string,
): Promise<AjusteResponse> {
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const currentStock =
    data.location === "WAREHOUSE" ? product.warehouseStock : product.gymStock;
  const newStock = currentStock + data.quantity;

  if (newStock < 0) {
    throw new Error(
      `El ajuste resultaría en existencia negativa. Existencia actual: ${currentStock}`,
    );
  }

  const inventoryMovement = await prisma.$transaction(async (tx) => {
    const movement = await tx.inventoryMovement.create({
      data: {
        productId: data.productId,
        type: "ADJUSTMENT",
        location: data.location,
        quantity: data.quantity,
        userId,
        notes: data.notes,
      },
      include: {
        product: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    await tx.product.update({
      where: { id: data.productId },
      data: {
        [data.location === "WAREHOUSE" ? "warehouseStock" : "gymStock"]:
          newStock,
      },
    });

    return movement;
  });

  return serializeAjuste(inventoryMovement);
}

// ==================== KARDEX SERVICE ====================

export async function getKardex(
  productId: number,
  limit?: number,
): Promise<KardexMovimientoResponse[]> {
  const movements = await prisma.inventoryMovement.findMany({
    where: { productId },
    select: {
      id: true,
      type: true,
      location: true,
      quantity: true,
      ticket: true,
      unitPrice: true,
      total: true,
      paymentMethod: true,
      notes: true,
      isCancelled: true,
      date: true,
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
    orderBy: { date: "asc" },
    take: limit,
  });

  let balance = 0;
  const serialized: KardexMovimientoResponse[] = [];

  for (const movement of movements) {
    balance += movement.quantity;
    serialized.push(serializeKardexMovement(movement, balance));
  }

  serialized.reverse();

  return serialized;
}

// ==================== QUERY SERVICES ====================

export async function getMovementsByProduct(
  productId: number,
  limit?: number,
): Promise<MovimientoInventarioResponse[]> {
  const movements = await prisma.inventoryMovement.findMany({
    where: { productId },
    include: {
      product: {
        select: {
          name: true,
          salePrice: true,
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
    orderBy: { date: "desc" },
    take: limit,
  });

  return movements.map(serializeInventoryMovement);
}

export async function getMovementsByDate(
  params: GetMovementsByDateParams,
): Promise<MovimientoInventarioResponse[]> {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      date: {
        gte: params.startDate,
        lte: params.endDate,
      },
    },
    include: {
      product: {
        select: {
          name: true,
          salePrice: true,
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
    orderBy: { date: "desc" },
  });

  return movements.map(serializeInventoryMovement);
}

export async function getSalesByTicket(
  ticket: string,
): Promise<VentaResponse[]> {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      ticket,
      type: "SALE",
    },
    include: {
      product: {
        select: {
          name: true,
          salePrice: true,
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
    orderBy: { date: "asc" },
  });

  return sales.map(serializeVenta);
}

export async function getSalesByShift(
  shiftId: number,
): Promise<VentaResponse[]> {
  const sales = await prisma.inventoryMovement.findMany({
    where: {
      shiftId,
      type: "SALE",
    },
    include: {
      product: {
        select: {
          name: true,
          salePrice: true,
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
    orderBy: { date: "asc" },
  });

  return sales.map(serializeVenta);
}

export async function getCancelledSales(
  params?: GetCancelledSalesParams,
): Promise<VentaResponse[]> {
  const where: {
    type: InventoryType;
    isCancelled: boolean;
    cancellationDate?: { gte: Date; lte: Date };
  } = {
    type: "SALE",
    isCancelled: true,
  };

  if (params?.startDate && params?.endDate) {
    where.cancellationDate = {
      gte: params.startDate,
      lte: params.endDate,
    };
  }

  const sales = await prisma.inventoryMovement.findMany({
    where,
    include: {
      product: {
        select: {
          name: true,
          salePrice: true,
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
    orderBy: { cancellationDate: "desc" },
  });

  return sales.map(serializeVenta);
}
