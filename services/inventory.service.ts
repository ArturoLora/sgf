// services/inventory.service.ts
import { prisma } from "@/lib/db";
import { InventoryType, Location, PaymentMethod } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { calculateMembershipDates } from "./members.service";
import { serializeDecimal } from "./utils";

// ==================== TYPES ====================

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

// ==================== VALIDATIONS ====================

/**
 * Valida que existe stock suficiente para una operación
 * Retorna el producto si pasa la validación
 */
async function validateStock(
  productId: number,
  quantity: number,
  location: Location,
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  // Verificar si es producto de membresía (no requiere stock)
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

/**
 * Crea una venta de producto
 * - Descuenta del stock de GYM
 * - Actualiza visitas del socio si aplica
 * - Renueva membresía si es producto de membresía
 */
export async function createSale(data: CreateSaleInput) {
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

  const operations: any[] = [
    prisma.inventoryMovement.create({
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
    }),
  ];

  // Solo descontar stock si NO es membresía
  if (!isMembership) {
    operations.push(
      prisma.product.update({
        where: { id: data.productId },
        data: {
          gymStock: product.gymStock - data.quantity,
        },
      }),
    );
  }

  const [inventoryMovement] = await prisma.$transaction(operations);

  // Actualizar socio si aplica
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

  return serializeDecimal(inventoryMovement);
}

/**
 * Cancela una venta
 * - Marca como cancelada
 * - Devuelve stock a GYM
 * - No afecta membresías ya renovadas
 */
export async function cancelSale(data: CancelSaleInput) {
  const sale = await prisma.inventoryMovement.findUnique({
    where: { id: data.inventoryId },
    include: { product: true },
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

  const [cancelledInventory] = await prisma.$transaction([
    prisma.inventoryMovement.update({
      where: { id: data.inventoryId },
      data: {
        isCancelled: true,
        cancellationReason: data.cancellationReason,
        cancellationDate: new Date(),
      },
      include: {
        product: true,
        member: true,
      },
    }),
    prisma.product.update({
      where: { id: sale.productId },
      data: {
        gymStock: sale.product.gymStock + quantityToReturn,
      },
    }),
  ]);

  return serializeDecimal(cancelledInventory);
}

// ==================== ENTRY SERVICES ====================

/**
 * Crea una entrada de producto a bodega o gym
 * Incrementa el stock correspondiente
 */
export async function createEntry(data: CreateEntryInput) {
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const type: InventoryType =
    data.location === "WAREHOUSE" ? "WAREHOUSE_ENTRY" : "GYM_ENTRY";

  const [inventoryMovement] = await prisma.$transaction([
    prisma.inventoryMovement.create({
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
    }),
    prisma.product.update({
      where: { id: data.productId },
      data: {
        [data.location === "WAREHOUSE" ? "warehouseStock" : "gymStock"]: {
          increment: data.quantity,
        },
      },
    }),
  ]);

  return serializeDecimal(inventoryMovement);
}

// ==================== TRANSFER SERVICES ====================

/**
 * Crea un traspaso entre bodega y gym
 * - Valida stock en origen
 * - Descuenta de origen, suma a destino
 */
export async function createTransfer(data: CreateTransferInput) {
  const origin: Location = data.destination === "GYM" ? "WAREHOUSE" : "GYM";

  const product = await validateStock(data.productId, data.quantity, origin);

  const type: InventoryType =
    data.destination === "GYM" ? "TRANSFER_TO_GYM" : "TRANSFER_TO_WAREHOUSE";

  const [inventoryMovement] = await prisma.$transaction([
    prisma.inventoryMovement.create({
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
    }),
    prisma.product.update({
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
    }),
  ]);

  return serializeDecimal(inventoryMovement);
}

// ==================== ADJUSTMENT SERVICES ====================

/**
 * Crea un ajuste de inventario
 * - Puede ser positivo (incrementa) o negativo (decrementa)
 * - Requiere observaciones obligatorias
 * - Valida que no resulte en stock negativo
 */
export async function createAdjustment(data: CreateAdjustmentInput) {
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

  const [inventoryMovement] = await prisma.$transaction([
    prisma.inventoryMovement.create({
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
    }),
    prisma.product.update({
      where: { id: data.productId },
      data: {
        [data.location === "WAREHOUSE" ? "warehouseStock" : "gymStock"]:
          newStock,
      },
    }),
  ]);

  return serializeDecimal(inventoryMovement);
}

// ==================== QUERY SERVICES ====================

/**
 * Obtiene movimientos de un producto específico
 */
export async function getMovementsByProduct(productId: number, limit?: number) {
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

  return serializeDecimal(movements);
}

/**
 * Obtiene movimientos dentro de un rango de fechas
 */
export async function getMovementsByDate(startDate: Date, endDate: Date) {
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

  return serializeDecimal(movements);
}

/**
 * Obtiene todas las ventas de un ticket específico
 */
export async function getSalesByTicket(ticket: string) {
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

  return serializeDecimal(sales);
}

/**
 * Obtiene ventas de un corte específico
 */
export async function getSalesByShift(shiftId: number) {
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
    },
    orderBy: { date: "asc" },
  });

  return serializeDecimal(sales);
}

/**
 * Obtiene ventas canceladas en un período
 */
export async function getCancelledSales(startDate?: Date, endDate?: Date) {
  const where: any = {
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

  return serializeDecimal(sales);
}
