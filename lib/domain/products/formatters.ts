// lib/domain/products/formatters.ts
/**
 * Products Domain - Formatters
 * Pure functions for formatting display data
 */

import type { ProductoResponse } from "@/types/api/products";
import {
  calculateStockStatus,
  calculateTotalStock,
  calculateStockDeficit,
} from "./calculations";

export type StockStatusLabel = "OK" | "Bajo" | "Sin stock";
export type StockStatusVariant = "default" | "outline" | "destructive";

export interface FormattedStockStatus {
  label: StockStatusLabel;
  variant: StockStatusVariant;
  className?: string;
}

// ==================== STOCK STATUS FORMATTING ====================

export function formatStockStatus(
  current: number,
  minimum: number,
): FormattedStockStatus {
  const status = calculateStockStatus(current, minimum);

  if (status.isCritical) {
    return {
      label: "Sin stock",
      variant: "destructive",
    };
  }

  if (status.isLow) {
    return {
      label: "Bajo",
      variant: "outline",
      className:
        "bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    };
  }

  return {
    label: "OK",
    variant: "default",
    className:
      "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  };
}

// ==================== CURRENCY FORMATTING ====================

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatInventoryValue(value: number): string {
  return `$${value.toFixed(2)}`;
}

// ==================== STOCK FORMATTING ====================

export function formatStockNumber(stock: number): string {
  return stock.toString();
}

export function formatStockSummary(product: ProductoResponse): string {
  const total = calculateTotalStock(product);
  return `Gym: ${product.gymStock} | Bodega: ${product.warehouseStock} | Total: ${total}`;
}

// ==================== PRODUCT LABELS ====================

export function getProductStatusLabel(isActive: boolean): string {
  return isActive ? "Activo" : "Inactivo";
}

export function getLocationLabel(
  location: "WAREHOUSE" | "GYM",
): "Bodega" | "Gym" {
  return location === "WAREHOUSE" ? "Bodega" : "Gym";
}

// ==================== ALERT MESSAGES ====================

export function formatLowStockMessage(product: ProductoResponse): string {
  const deficit = calculateStockDeficit(product);

  if (deficit.gym > 0 && deficit.warehouse > 0) {
    return `Stock bajo en Gym (falta ${deficit.gym}) y Bodega (falta ${deficit.warehouse})`;
  }

  if (deficit.gym > 0) {
    return `Stock bajo en Gym (falta ${deficit.gym})`;
  }

  if (deficit.warehouse > 0) {
    return `Stock bajo en Bodega (falta ${deficit.warehouse})`;
  }

  return "";
}

export function formatStockWarning(
  product: ProductoResponse,
): string | undefined {
  const total = calculateTotalStock(product);

  if (total < product.minStock) {
    return `⚠️ Stock total bajo mínimo (${product.minStock} unidades)`;
  }

  return undefined;
}

// ==================== SUCCESS MESSAGES ====================

export function formatSuccessMessage(
  action: "crear" | "actualizar" | "entrada" | "traspaso" | "ajuste",
  productName: string,
  details?: string,
): string {
  switch (action) {
    case "crear":
      return `Producto creado: ${productName}`;
    case "actualizar":
      return `Producto actualizado: ${productName}`;
    case "entrada":
      return details || `Entrada registrada para ${productName}`;
    case "traspaso":
      return details || `Traspaso realizado: ${productName}`;
    case "ajuste":
      return details || `Ajuste realizado para ${productName}`;
  }
}

// ==================== MOVEMENT LABELS ====================

export function getMovementTypeLabel(
  type: string,
): "Entrada" | "Traspaso" | "Ajuste" | "Venta" | "Movimiento" {
  switch (type) {
    case "ENTRY":
      return "Entrada";
    case "TRANSFER":
      return "Traspaso";
    case "ADJUSTMENT":
      return "Ajuste";
    case "SALE":
      return "Venta";
    default:
      return "Movimiento";
  }
}

export function formatMovementDescription(movement: {
  type: string;
  location?: string;
  from?: string;
  to?: string;
}): string {
  switch (movement.type) {
    case "ENTRY":
      return `Entrada en ${getLocationLabel(movement.location as "WAREHOUSE" | "GYM")}`;
    case "TRANSFER":
      return `Traspaso: ${getLocationLabel(movement.from as "WAREHOUSE" | "GYM")} → ${getLocationLabel(movement.to as "WAREHOUSE" | "GYM")}`;
    case "ADJUSTMENT":
      return "Ajuste de inventario";
    case "SALE":
      return "Venta";
    default:
      return "Movimiento";
  }
}
