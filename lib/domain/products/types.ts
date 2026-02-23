// lib/domain/products/types.ts
// Tipos internos del dominio de productos
// SIN dependencias externas (no @/types/api, no Prisma)

// ==================== ENTIDAD PRODUCTO ====================

export interface Producto {
  id: number;
  name: string;
  salePrice: number;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

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
