// lib/domain/products/statistics.ts
/**
 * Products Domain - Statistics
 * Pure functions for calculating product statistics
 */

import type { ProductoResponse } from "@/types/api/products";
import {
  calculateTotalStock,
  calculateInventoryValue,
  hasLowStock,
} from "./calculations";

export interface ProductStatistics {
  total: number;
  active: number;
  inactive: number;
  lowStock: number;
  criticalStock: number;
  inventoryValue: number;
}

// ==================== MAIN STATISTICS ====================

export function calculateProductStatistics(
  products: ProductoResponse[],
): ProductStatistics {
  const total = products.length;
  const active = products.filter((p) => p.isActive).length;
  const inactive = total - active;
  const activeProducts = products.filter((p) => p.isActive);
  const lowStock = activeProducts.filter(hasLowStock).length;
  const criticalStock = activeProducts.filter(
    (p) => p.gymStock === 0 || p.warehouseStock === 0,
  ).length;
  const inventoryValue = calculateInventoryValue(activeProducts);

  return {
    total,
    active,
    inactive,
    lowStock,
    criticalStock,
    inventoryValue,
  };
}

// ==================== CATEGORY STATISTICS ====================

export interface CategoryStats {
  memberships: number;
  products: number;
  activeProducts: number;
}

export function calculateCategoryStatistics(
  products: ProductoResponse[],
  isMembership: (p: ProductoResponse) => boolean,
): CategoryStats {
  const memberships = products.filter(isMembership).length;
  const nonMemberships = products.filter((p) => !isMembership(p));

  return {
    memberships,
    products: nonMemberships.length,
    activeProducts: nonMemberships.filter((p) => p.isActive).length,
  };
}

// ==================== STOCK STATISTICS ====================

export interface StockStats {
  totalGym: number;
  totalWarehouse: number;
  totalCombined: number;
  averageStock: number;
  lowStockGym: number;
  lowStockWarehouse: number;
}

export function calculateStockStatistics(
  products: ProductoResponse[],
): StockStats {
  const activeProducts = products.filter((p) => p.isActive);

  const totalGym = activeProducts.reduce((sum, p) => sum + p.gymStock, 0);
  const totalWarehouse = activeProducts.reduce(
    (sum, p) => sum + p.warehouseStock,
    0,
  );
  const totalCombined = totalGym + totalWarehouse;
  const averageStock =
    activeProducts.length > 0 ? totalCombined / activeProducts.length : 0;

  const lowStockGym = activeProducts.filter(
    (p) => p.gymStock < p.minStock,
  ).length;
  const lowStockWarehouse = activeProducts.filter(
    (p) => p.warehouseStock < p.minStock,
  ).length;

  return {
    totalGym,
    totalWarehouse,
    totalCombined,
    averageStock,
    lowStockGym,
    lowStockWarehouse,
  };
}

// ==================== VALUE STATISTICS ====================

export interface ValueStats {
  totalValue: number;
  averageValue: number;
  highestValue: number;
  lowestValue: number;
  gymValue: number;
  warehouseValue: number;
}

export function calculateValueStatistics(
  products: ProductoResponse[],
): ValueStats {
  const activeProducts = products.filter((p) => p.isActive);

  if (activeProducts.length === 0) {
    return {
      totalValue: 0,
      averageValue: 0,
      highestValue: 0,
      lowestValue: 0,
      gymValue: 0,
      warehouseValue: 0,
    };
  }

  const productValues = activeProducts.map((p) => {
    const total = calculateTotalStock(p);
    return p.salePrice * total;
  });

  const totalValue = calculateInventoryValue(activeProducts);
  const averageValue = totalValue / activeProducts.length;
  const highestValue = Math.max(...productValues);
  const lowestValue = Math.min(...productValues);

  const gymValue = activeProducts.reduce(
    (sum, p) => sum + p.salePrice * p.gymStock,
    0,
  );
  const warehouseValue = activeProducts.reduce(
    (sum, p) => sum + p.salePrice * p.warehouseStock,
    0,
  );

  return {
    totalValue,
    averageValue,
    highestValue,
    lowestValue,
    gymValue,
    warehouseValue,
  };
}

// ==================== TOP PRODUCTS ====================

export function getTopProductsByValue(
  products: ProductoResponse[],
  limit: number = 10,
): ProductoResponse[] {
  return [...products]
    .filter((p) => p.isActive)
    .sort((a, b) => {
      const valueA = a.salePrice * calculateTotalStock(a);
      const valueB = b.salePrice * calculateTotalStock(b);
      return valueB - valueA;
    })
    .slice(0, limit);
}

export function getTopProductsByStock(
  products: ProductoResponse[],
  limit: number = 10,
): ProductoResponse[] {
  return [...products]
    .filter((p) => p.isActive)
    .sort((a, b) => calculateTotalStock(b) - calculateTotalStock(a))
    .slice(0, limit);
}

export function getLowStockProducts(
  products: ProductoResponse[],
): ProductoResponse[] {
  return products.filter((p) => p.isActive && hasLowStock(p));
}
