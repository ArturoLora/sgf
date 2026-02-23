// lib/domain/products/filters.ts
// Funciones puras de filtrado de productos
// SIN dependencias externas

import type {
  Producto,
  ProductFilters,
  ProductStatusFilter,
  ProductOrderBy,
  ProductOrder,
} from "./types";

export const DEFAULT_FILTERS: ProductFilters = {
  search: "",
  status: "todos",
  orderBy: "name",
  order: "asc",
};

export function filterBySearch(
  products: Producto[],
  search: string,
): Producto[] {
  if (!search) return products;
  const lower = search.toLowerCase();
  return products.filter((p) => p.name.toLowerCase().includes(lower));
}

export function filterByStatus(
  products: Producto[],
  status: ProductStatusFilter,
): Producto[] {
  switch (status) {
    case "activos":
      return products.filter((p) => p.isActive);
    case "inactivos":
      return products.filter((p) => !p.isActive);
    case "bajoStock":
      return products.filter(
        (p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock,
      );
    default:
      return products;
  }
}

export function sortProducts(
  products: Producto[],
  orderBy: ProductOrderBy,
  order: ProductOrder,
): Producto[] {
  const sorted = [...products];
  sorted.sort((a, b) => {
    let valueA: string | number;
    let valueB: string | number;

    switch (orderBy) {
      case "name":
        valueA = a.name;
        valueB = b.name;
        break;
      case "salePrice":
        valueA = Number(a.salePrice);
        valueB = Number(b.salePrice);
        break;
      case "gymStock":
        valueA = a.gymStock;
        valueB = b.gymStock;
        break;
      case "warehouseStock":
        valueA = a.warehouseStock;
        valueB = b.warehouseStock;
        break;
      default:
        valueA = a.name;
        valueB = b.name;
    }

    if (valueA < valueB) return order === "asc" ? -1 : 1;
    if (valueA > valueB) return order === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}

export function applyFilters(
  products: Producto[],
  filters: ProductFilters,
): Producto[] {
  let result = filterBySearch(products, filters.search);
  result = filterByStatus(result, filters.status);
  result = sortProducts(result, filters.orderBy, filters.order);
  return result;
}

export function hasActiveFilters(filters: ProductFilters): boolean {
  return filters.search !== "" || filters.status !== "todos";
}
