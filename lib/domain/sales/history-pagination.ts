// lib/domain/sales/history-pagination.ts
// Funciones puras de paginación para el historial de ventas
// SIN dependencias externas (no React, no UI, no fetch)

/**
 * Valida si una página es válida dentro del rango disponible
 */
export function isValidPage(page: number, totalPages: number): boolean {
  return page >= 1 && page <= totalPages;
}

/**
 * Calcula si hay página anterior disponible
 */
export function hasPreviousPage(currentPage: number): boolean {
  return currentPage > 1;
}

/**
 * Calcula si hay página siguiente disponible
 */
export function hasNextPage(currentPage: number, totalPages: number): boolean {
  return currentPage < totalPages;
}

/**
 * Calcula el número total de páginas
 */
export function calculateTotalPages(
  totalItems: number,
  itemsPerPage: number,
): number {
  return Math.ceil(totalItems / itemsPerPage);
}
