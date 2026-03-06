// lib/domain/products/types.ts
// Tipos internos del dominio de productos
// SIN dependencias externas (no @/types/api, no Prisma)

// ==================== ENTIDAD PRODUCTO ====================
// La entidad Producto vive en types/models/producto.ts (fuente de verdad).
// Se re-exporta aquí para que los consumidores del dominio puedan importarla
// desde un único punto sin romper la encapsulación del módulo.

export type { Producto } from "@/types/models/producto";

// ==================== FILTROS ====================

export type ProductStatusFilter =
  | "todos"
  | "activos"
  | "inactivos"
  | "bajoStock";

export type ProductOrderBy =
  | "name"
  | "salePrice"
  | "gymStock"
  | "warehouseStock";

export type ProductOrder = "asc" | "desc";

export interface ProductFilters {
  search: string;
  status: ProductStatusFilter;
  orderBy: ProductOrderBy;
  order: ProductOrder;
}

// ==================== ESTADÍSTICAS ====================

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  inventoryValue: number;
}

// ==================== ESTADO DE STOCK ====================

export type StockStatus = {
  color: "destructive" | "outline" | "default";
  text: string;
  className?: string;
};
