// lib/domain/products/calculations.ts
/**
 * Products Domain - Calculations
 * Pure functions for stock and inventory calculations
 */

import type { ProductoResponse } from "@/types/api/products";

export interface StockStatus {
  isLow: boolean;
  isCritical: boolean;
  available: number;
  minimum: number;
  deficit: number;
}

// ==================== STOCK CALCULATIONS ====================

export function calculateStockStatus(
  current: number,
  minimum: number,
): StockStatus {
  const deficit = Math.max(0, minimum - current);

  return {
    isLow: current < minimum,
    isCritical: current === 0,
    available: current,
    minimum,
    deficit,
  };
}

export function calculateTotalStock(product: ProductoResponse): number {
  return product.warehouseStock + product.gymStock;
}

export function calculateInventoryValue(products: ProductoResponse[]): number {
  return products.reduce((sum, product) => {
    const totalStock = calculateTotalStock(product);
    return sum + product.salePrice * totalStock;
  }, 0);
}

// ==================== STOCK VALIDATION ====================

export function hasLowStock(product: ProductoResponse): boolean {
  return (
    product.gymStock < product.minStock ||
    product.warehouseStock < product.minStock
  );
}

export function hasCriticalStock(product: ProductoResponse): boolean {
  return product.gymStock === 0 || product.warehouseStock === 0;
}

export function canFulfillQuantity(
  available: number,
  requested: number,
): boolean {
  return available >= requested;
}

// ==================== STOCK ANALYTICS ====================

export interface StockDeficit {
  gym: number;
  warehouse: number;
  total: number;
}

export function calculateStockDeficit(product: ProductoResponse): StockDeficit {
  const gymDeficit = Math.max(0, product.minStock - product.gymStock);
  const warehouseDeficit = Math.max(
    0,
    product.minStock - product.warehouseStock,
  );

  return {
    gym: gymDeficit,
    warehouse: warehouseDeficit,
    total: gymDeficit + warehouseDeficit,
  };
}

export interface StockDistribution {
  gymPercentage: number;
  warehousePercentage: number;
  isBalanced: boolean;
}

export function calculateStockDistribution(
  product: ProductoResponse,
): StockDistribution {
  const total = calculateTotalStock(product);

  if (total === 0) {
    return {
      gymPercentage: 0,
      warehousePercentage: 0,
      isBalanced: true,
    };
  }

  const gymPercentage = (product.gymStock / total) * 100;
  const warehousePercentage = (product.warehouseStock / total) * 100;
  const difference = Math.abs(gymPercentage - warehousePercentage);

  return {
    gymPercentage,
    warehousePercentage,
    isBalanced: difference <= 20, // Balanced if within 20% difference
  };
}
