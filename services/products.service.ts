import { prisma } from "@/lib/db";
import { Location } from "@prisma/client";
import { mapLocation } from "./enum-mappers";
import { parseBooleanQuery, parseIntParam } from "./utils";
import {
  ProductsQuerySchema,
  CreateProductInputSchema,
  UpdateProductInputSchema,
} from "@/types/api/products";
import type {
  ProductoResponse,
  ProductoConMovimientosResponse,
  ProductoBajoStockResponse,
  StockProductoResponse,
  EstadisticasProductosResponse,
  ProductsQueryInput,
  CreateProductInputRaw,
  UpdateProductInputRaw,
  CrearProductoRequest,
  ActualizarProductoRequest,
} from "@/types/api/products";
import type { ProductoVentaResponse } from "@/types/api/sales";

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

export interface SearchProductsParams {
  search?: string;
  isActive?: boolean;
  lowStock?: boolean;
}

// ==================== PARSING HELPERS ====================

export function parseProductsQuery(
  raw: ProductsQueryInput,
): SearchProductsParams {
  const validated = ProductsQuerySchema.parse(raw);

  return {
    search: validated.search,
    isActive: parseBooleanQuery(validated.isActive),
    lowStock: parseBooleanQuery(validated.lowStock) ?? false,
  };
}

export function parseCreateProductInput(
  raw: CreateProductInputRaw,
): CrearProductoRequest {
  const validated = CreateProductInputSchema.parse(raw);

  return {
    name: validated.name,
    salePrice: validated.salePrice,
    minStock: validated.minStock,
  };
}

export function parseUpdateProductInput(
  raw: UpdateProductInputRaw,
): ActualizarProductoRequest {
  const validated = UpdateProductInputSchema.parse(raw);

  return {
    name: validated.name,
    salePrice: validated.salePrice,
    minStock: validated.minStock,
    isActive: validated.isActive,
  };
}

export function parseProductId(id: string): number {
  return parseIntParam(id, "ID de producto");
}

// ==================== SERVICE METHODS ====================

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
  data: CrearProductoRequest,
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
  data: ActualizarProductoRequest,
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

export async function getLowStockProducts(): Promise<
  ProductoBajoStockResponse[]
> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });

  const result = products.filter(
    (p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock,
  );

  return result.map((p) => ({
    id: p.id,
    name: p.name,
    gymStock: p.gymStock,
    warehouseStock: p.warehouseStock,
    minStock: p.minStock,
    stockFaltante: {
      gym: Math.max(0, p.minStock - p.gymStock),
      warehouse: Math.max(0, p.minStock - p.warehouseStock),
    },
  }));
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

export async function getSaleProducts(): Promise<ProductoVentaResponse[]> {
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

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    salePrice: Number(p.salePrice),
    gymStock: p.gymStock,
    warehouseStock: p.warehouseStock,
    totalStock: p.gymStock + p.warehouseStock,
  }));
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
