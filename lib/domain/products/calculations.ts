import type { ProductoResponse } from "@/types/api/products";

export function computeTotalStock(product: ProductoResponse): number {
  return product.warehouseStock + product.gymStock;
}

export function isLowStock(product: ProductoResponse): boolean {
  return (
    product.gymStock < product.minStock ||
    product.warehouseStock < product.minStock
  );
}

export function computeActiveCount(products: ProductoResponse[]): number {
  return products.filter((p) => p.isActive).length;
}

export function computeLowStockCount(products: ProductoResponse[]): number {
  return products.filter((p) => p.isActive && isLowStock(p)).length;
}

export function computeLowStockProducts(
  products: ProductoResponse[],
): ProductoResponse[] {
  return products.filter((p) => p.isActive && isLowStock(p));
}

export function computeInventoryValue(products: ProductoResponse[]): number {
  return products
    .filter((p) => p.isActive)
    .reduce((sum, p) => {
      const total = computeTotalStock(p);
      return sum + Number(p.salePrice) * total;
    }, 0);
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  inventoryValue: number;
}

export function computeStats(products: ProductoResponse[]): ProductStats {
  return {
    totalProducts: products.length,
    activeProducts: computeActiveCount(products),
    lowStockProducts: computeLowStockCount(products),
    inventoryValue: computeInventoryValue(products),
  };
}

export type StockStatus = {
  color: "destructive" | "outline" | "default";
  text: string;
  className?: string;
};

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
  product: ProductoResponse,
  location: string,
): number {
  return location === "WAREHOUSE" ? product.warehouseStock : product.gymStock;
}
