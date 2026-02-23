// lib/domain/products/calculations.ts
// Funciones puras de cálculo para productos
// SIN dependencias externas

import type { Producto, ProductStats, StockStatus } from "./types";

export function computeTotalStock(product: Producto): number {
  return product.warehouseStock + product.gymStock;
}

export function isLowStock(product: Producto): boolean {
  return (
    product.gymStock < product.minStock ||
    product.warehouseStock < product.minStock
  );
}

export function computeActiveCount(products: Producto[]): number {
  return products.filter((p) => p.isActive).length;
}

export function computeLowStockCount(products: Producto[]): number {
  return products.filter((p) => p.isActive && isLowStock(p)).length;
}

export function computeLowStockProducts(products: Producto[]): Producto[] {
  return products.filter((p) => p.isActive && isLowStock(p));
}

export function computeInventoryValue(products: Producto[]): number {
  return products
    .filter((p) => p.isActive)
    .reduce((sum, p) => {
      const total = computeTotalStock(p);
      return sum + Number(p.salePrice) * total;
    }, 0);
}

export function computeStats(products: Producto[]): ProductStats {
  return {
    totalProducts: products.length,
    activeProducts: computeActiveCount(products),
    lowStockProducts: computeLowStockCount(products),
    inventoryValue: computeInventoryValue(products),
  };
}

export function getStockStatus(current: number, min: number): StockStatus {
  if (current === 0) {
    return { color: "destructive", text: "Sin stock" };
  }
  if (current < min) {
    return {
      color: "outline",
      text: "Bajo",
      className:
        "bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    };
  }
  return {
    color: "default",
    text: "OK",
    className:
      "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  };
}

export function getStockByLocation(
  product: Producto,
  location: string,
): number {
  return location === "WAREHOUSE" ? product.warehouseStock : product.gymStock;
}
