import { prisma } from "@/lib/db";
import { InventoryType, Location, PaymentMethod } from "@prisma/client";
import { calculateMembershipDates } from "./members.service";
import {
  mapInventoryType,
  mapLocation,
  mapPaymentMethod,
} from "./enum-mappers";
import type {
  VentaCreada,
  EntradaCreada,
  TraspasoCreado,
  AjusteCreado,
  VentaCancelada,
  MovimientoInventarioResponse,
} from "@/types/api/inventory";

// ==================== INPUT TYPES ====================

export interface CreateSaleInput {
  productId: number;
  quantity: number;
  memberId?: number;
  userId: string;
  unitPrice?: number;
  discount?: number;
  surcharge?: number;
  paymentMethod: PaymentMethod;
  ticket: string;
  shiftId?: number;
  notes?: string;
}

export interface CreateEntryInput {
  productId: number;
  quantity: number;
  location: Location;
  userId: string;
  notes?: string;
}

export interface CreateTransferInput {
  productId: number;
  quantity: number;
  destination: Location;
  userId: string;
  notes?: string;
}

export interface CreateAdjustmentInput {
  productId: number;
  quantity: number;
  location: Location;
  userId: string;
  notes: string;
}

export interface CancelSaleInput {
  inventoryId: number;
  userId: string;
  cancellationReason: string;
}

// ==================== HELPERS ====================

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
  return {
    id: movement.id,
    productId: movement.productId,
    type: mapInventoryType(movement.type),
    location: mapLocation(movement.location),
    quantity: movement.quantity,
    ticket: movement.ticket ?? undefined,
    memberId: movement.memberId ?? undefined,
    userId: movement.userId,
    unitPrice: movement.unitPrice ? Number(movement.unitPrice) : undefined,
    subtotal: movement.subtotal ? Number(movement.subtotal) : undefined,
    discount: movement.discount ? Number(movement.discount) : undefined,
    surcharge: movement.surcharge ? Number(movement.surcharge) : undefined,
    total: movement.total ? Number(movement.total) : undefined,
    paymentMethod: movement.paymentMethod
      ? mapPaymentMethod(movement.paymentMethod)
      : undefined,
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

  const isMembership =
    product.name.includes("EFECTIVO") ||
    product.name.includes("VISITA") ||
    product.name.includes("MENSUALIDAD") ||
    product.name.includes("SEMANA") ||
    product.name.includes("TRIMESTRE") ||
    product.name.includes("ANUAL");

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

// ==================== SALE SERVICES ====================

export async function createSale(data: CreateSaleInput): Promise<VentaCreada> {
  const product = await validateStock(data.productId, data.quantity, "GYM");

  const unitPrice = data.unitPrice || product.salePrice;
  const subtotal = Number(unitPrice) * data.quantity;
  const discount = data.discount || 0;
  const surcharge = data.surcharge || 0;
  const total = subtotal - Number(discount) + Number(surcharge);

  const isMembership =
    product.name.includes("EFECTIVO") ||
    product.name.includes("VISITA") ||
    product.name.includes("MENSUALIDAD") ||
    product.name.includes("SEMANA") ||
    product.name.includes("TRIMESTRE") ||
    product.name.includes("ANUAL");

  const inventoryMovement = await prisma.$transaction(async (tx) => {
    const movement = await tx.inventoryMovement.create({
      data: {
        productId: data.productId,
        type: "SALE",
        location: "GYM",
        quantity: -data.quantity,
        ticket: data.ticket,
        memberId: data.memberId,
        userId: data.userId,
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

  return serializeInventoryMovement(inventoryMovement) as VentaCreada;
}

export async function cancelSale(
  data: CancelSaleInput,
): Promise<VentaCancelada> {
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

  return serializeInventoryMovement(cancelledInventory) as VentaCancelada;
}

// ==================== ENTRY SERVICES ====================

export async function createEntry(
  data: CreateEntryInput,
): Promise<EntradaCreada> {
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
        userId: data.userId,
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

  return serializeInventoryMovement(inventoryMovement) as EntradaCreada;
}

// ==================== TRANSFER SERVICES ====================

export async function createTransfer(
  data: CreateTransferInput,
): Promise<TraspasoCreado> {
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
        userId: data.userId,
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

  return serializeInventoryMovement(inventoryMovement) as TraspasoCreado;
}

// ==================== ADJUSTMENT SERVICES ====================

export async function createAdjustment(
  data: CreateAdjustmentInput,
): Promise<AjusteCreado> {
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
        userId: data.userId,
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

  return serializeInventoryMovement(inventoryMovement) as AjusteCreado;
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
  startDate: Date,
  endDate: Date,
): Promise<MovimientoInventarioResponse[]> {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
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
): Promise<MovimientoInventarioResponse[]> {
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

  return sales.map(serializeInventoryMovement);
}

export async function getSalesByShift(
  shiftId: number,
): Promise<MovimientoInventarioResponse[]> {
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

  return sales.map(serializeInventoryMovement);
}

export async function getCancelledSales(
  startDate?: Date,
  endDate?: Date,
): Promise<MovimientoInventarioResponse[]> {
  const where: {
    type: InventoryType;
    isCancelled: boolean;
    cancellationDate?: { gte: Date; lte: Date };
  } = {
    type: "SALE",
    isCancelled: true,
  };

  if (startDate && endDate) {
    where.cancellationDate = {
      gte: startDate,
      lte: endDate,
    };
  }

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
    orderBy: { cancellationDate: "desc" },
  });

  return sales.map(serializeInventoryMovement);
}
