// lib/domain/products/filters.ts
/**
 * Products Domain - Filters
 * Pure functions for filtering product lists
 */

import type { ProductoResponse } from "@/types/api/products";
import { hasLowStock } from "./calculations";
import { isMembershipProduct } from "./validators";

export type ProductStatus = "todos" | "activos" | "inactivos" | "bajoStock";
export type SortField = "name" | "salePrice" | "gymStock" | "warehouseStock";
export type SortOrder = "asc" | "desc";

export interface ProductFilters {
  search: string;
  status: ProductStatus;
  orderBy: SortField;
  order: SortOrder;
}

// ==================== FILTER FUNCTIONS ====================

export function filterBySearch(
  products: ProductoResponse[],
  search: string,
): ProductoResponse[] {
  if (!search) return products;

  const searchLower = search.toLowerCase();
  return products.filter((product) =>
    product.name.toLowerCase().includes(searchLower),
  );
}

export function filterByStatus(
  products: ProductoResponse[],
  status: ProductStatus,
): ProductoResponse[] {
  switch (status) {
    case "activos":
      return products.filter((p) => p.isActive);
    case "inactivos":
      return products.filter((p) => !p.isActive);
    case "bajoStock":
      return products.filter(hasLowStock);
    case "todos":
    default:
      return products;
  }
}

export function filterMemberships(
  products: ProductoResponse[],
): ProductoResponse[] {
  return products.filter(isMembershipProduct);
}

export function filterNonMemberships(
  products: ProductoResponse[],
): ProductoResponse[] {
  return products.filter((p) => !isMembershipProduct(p));
}

export function filterActive(products: ProductoResponse[]): ProductoResponse[] {
  return products.filter((p) => p.isActive);
}

export function filterLowStock(
  products: ProductoResponse[],
): ProductoResponse[] {
  return products.filter(hasLowStock);
}

// ==================== SORT FUNCTIONS ====================

export function sortProducts(
  products: ProductoResponse[],
  field: SortField,
  order: SortOrder,
): ProductoResponse[] {
  const sorted = [...products].sort((a, b) => {
    let valueA: string | number;
    let valueB: string | number;

    switch (field) {
      case "name":
        valueA = a.name;
        valueB = b.name;
        break;
      case "salePrice":
        valueA = a.salePrice;
        valueB = b.salePrice;
        break;
      case "gymStock":
        valueA = a.gymStock;
        valueB = b.gymStock;
        break;
      case "warehouseStock":
        valueA = a.warehouseStock;
        valueB = b.warehouseStock;
        break;
    }

    if (valueA < valueB) return order === "asc" ? -1 : 1;
    if (valueA > valueB) return order === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
}

// ==================== COMBINED OPERATIONS ====================

export function applyFilters(
  products: ProductoResponse[],
  filters: ProductFilters,
): ProductoResponse[] {
  let result = [...products];

  result = filterBySearch(result, filters.search);
  result = filterByStatus(result, filters.status);
  result = sortProducts(result, filters.orderBy, filters.order);

  return result;
}
