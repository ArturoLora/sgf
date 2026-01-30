// services/products.service.ts
import { prisma } from "@/lib/db";
import { Location } from "@prisma/client";
import { mapLocation } from "./enum-mappers";
import type {
  ProductoResponse,
  ProductoConMovimientosResponse,
  StockProductoResponse,
  EstadisticasProductosResponse,
} from "@/types/api/products";

function serializeProduct(product: {
  id: number;
  name: string;
  salePrice: import("@prisma/client/runtime/library").Decimal;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ProductoResponse {
  return {
    id: product.id,
    name: product.name,
    salePrice: Number(product.salePrice),
    warehouseStock: product.warehouseStock,
    gymStock: product.gymStock,
    minStock: product.minStock,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export interface CreateProductInput {
  name: string;
  salePrice: number;
  minStock?: number;
}

export interface UpdateProductInput {
  name?: string;
  salePrice?: number;
  minStock?: number;
  isActive?: boolean;
}

export interface SearchProductsParams {
  search?: string;
  isActive?: boolean;
  lowStock?: boolean;
}

export async function getAllProducts(
  params?: SearchProductsParams,
): Promise<ProductoResponse[]> {
  const where: {
    name?: { contains: string; mode: "insensitive" };
    isActive?: boolean;
  } = {};

  if (params?.search) {
    where.name = {
      contains: params.search,
      mode: "insensitive",
    };
  }

  if (params?.isActive !== undefined) {
    where.isActive = params.isActive;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  });

  let result = products;

  if (params?.lowStock) {
    result = products.filter(
      (p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock,
    );
  }

  return result.map(serializeProduct);
}

export async function getProductById(
  id: number,
): Promise<ProductoConMovimientosResponse> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      inventoryMovements: {
        orderBy: { date: "desc" },
        take: 20,
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
      },
    },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  return {
    ...serializeProduct(product),
    inventoryMovements: product.inventoryMovements.map((m) => ({
      id: m.id,
      type: m.type,
      location: mapLocation(m.location),
      quantity: m.quantity,
      ticket: m.ticket ?? undefined,
      unitPrice: m.unitPrice ? Number(m.unitPrice) : undefined,
      total: m.total ? Number(m.total) : undefined,
      notes: m.notes ?? undefined,
      isCancelled: m.isCancelled,
      date: m.date,
      user: {
        name: m.user.name,
      },
      member: m.member
        ? {
            memberNumber: m.member.memberNumber,
            name: m.member.name ?? undefined,
          }
        : undefined,
    })),
  };
}

export async function createProduct(
  data: CreateProductInput,
): Promise<ProductoResponse> {
  const existingProduct = await prisma.product.findUnique({
    where: { name: data.name },
  });

  if (existingProduct) {
    throw new Error("Ya existe un producto con ese nombre");
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      salePrice: data.salePrice,
      minStock: data.minStock || 0,
    },
  });

  return serializeProduct(product);
}

export async function updateProduct(
  id: number,
  data: UpdateProductInput,
): Promise<ProductoResponse> {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  if (data.name && data.name !== product.name) {
    const existingProduct = await prisma.product.findUnique({
      where: { name: data.name },
    });

    if (existingProduct) {
      throw new Error("Ya existe un producto con ese nombre");
    }
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data,
  });

  return serializeProduct(updatedProduct);
}

export async function toggleProductStatus(
  id: number,
): Promise<ProductoResponse> {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
  });

  return serializeProduct(updatedProduct);
}

export async function getActiveProducts(): Promise<ProductoResponse[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return products.map(serializeProduct);
}

export async function getLowStockProducts(): Promise<ProductoResponse[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });

  const result = products.filter(
    (p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock,
  );

  return result.map(serializeProduct);
}

export async function getProductStock(
  productId: number,
  location?: Location,
): Promise<StockProductoResponse | number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  if (location === "WAREHOUSE") {
    return product.warehouseStock;
  } else if (location === "GYM") {
    return product.gymStock;
  }

  return {
    warehouse: product.warehouseStock,
    gym: product.gymStock,
    total: product.warehouseStock + product.gymStock,
  };
}

export async function getMembershipProducts(): Promise<ProductoResponse[]> {
  const keywords = ["EFECTIVO", "VISITA", "MENSUALIDAD", "SEMANA"];

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: keywords.map((keyword) => ({
        name: { contains: keyword, mode: "insensitive" },
      })),
    },
    orderBy: { name: "asc" },
  });

  return products.map(serializeProduct);
}

export async function getSaleProducts(): Promise<ProductoResponse[]> {
  const keywords = ["EFECTIVO", "VISITA", "MENSUALIDAD", "SEMANA"];

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      NOT: {
        OR: keywords.map((keyword) => ({
          name: { contains: keyword, mode: "insensitive" },
        })),
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map(serializeProduct);
}

export async function getProductsStatistics(): Promise<EstadisticasProductosResponse> {
  const total = await prisma.product.count();
  const active = await prisma.product.count({ where: { isActive: true } });

  const products = await prisma.product.findMany({
    where: { isActive: true },
  });

  const lowStockGym = products.filter((p) => p.gymStock < p.minStock).length;
  const lowStockWarehouse = products.filter(
    (p) => p.warehouseStock < p.minStock,
  ).length;

  const inventoryValue = products.reduce((sum, p) => {
    const totalStock = p.warehouseStock + p.gymStock;
    return sum + Number(p.salePrice) * totalStock;
  }, 0);

  return {
    total,
    active,
    lowStockGym,
    lowStockWarehouse,
    inventoryValue,
  };
}
