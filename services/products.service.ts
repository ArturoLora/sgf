// services/products.service.ts
import { prisma } from "@/lib/db";
import { Location } from "@prisma/client";
import { serializeDecimal } from "./utils";

// ==================== TYPES ====================

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

// ==================== PUBLIC SERVICES ====================

/**
 * Lista todos los productos con filtros opcionales
 * - Búsqueda por nombre
 * - Filtro por activo/inactivo
 * - Filtro por stock bajo
 */
export async function getAllProducts(params?: SearchProductsParams) {
  const where: any = {};

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

  // Filtro de stock bajo se aplica después del query
  if (params?.lowStock) {
    result = products.filter(
      (p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock,
    );
  }

  return serializeDecimal(result);
}

/**
 * Obtiene un producto por ID con sus últimos movimientos
 */
export async function getProductById(id: number) {
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

  return serializeDecimal(product);
}

/**
 * Crea un nuevo producto
 * Valida que el nombre sea único
 */
export async function createProduct(data: CreateProductInput) {
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

  return serializeDecimal(product);
}

/**
 * Actualiza un producto existente
 * Valida unicidad de nombre si se cambia
 */
export async function updateProduct(id: number, data: UpdateProductInput) {
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

  return serializeDecimal(updatedProduct);
}

/**
 * Activa/desactiva un producto
 */
export async function toggleProductStatus(id: number) {
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

  return serializeDecimal(updatedProduct);
}

/**
 * Lista solo productos activos
 */
export async function getActiveProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return serializeDecimal(products);
}

/**
 * Lista productos con stock bajo en cualquier ubicación
 */
export async function getLowStockProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });

  const result = products.filter(
    (p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock,
  );

  return serializeDecimal(result);
}

/**
 * Obtiene el stock de un producto
 * - Si se especifica ubicación, retorna solo ese stock
 * - Si no, retorna bodega, gym y total
 */
export async function getProductStock(productId: number, location?: Location) {
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

  return serializeDecimal({
    warehouse: product.warehouseStock,
    gym: product.gymStock,
    total: product.warehouseStock + product.gymStock,
  });
}

/**
 * Lista productos de membresía
 * Identifica por keywords en el nombre
 */
export async function getMembershipProducts() {
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

  return serializeDecimal(products);
}

/**
 * Lista productos de venta (físicos)
 * Excluye productos de membresía
 */
export async function getSaleProducts() {
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

  return serializeDecimal(products);
}

/**
 * Genera estadísticas generales de productos
 */
export async function getProductsStatistics() {
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
