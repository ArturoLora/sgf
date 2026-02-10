// lib/domain/products/pagination.ts
/**
 * Products Domain - Pagination
 * Pure functions for paginating product lists
 */

import type { ProductoResponse } from "@/types/api/products";

export interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ==================== PAGINATION LOGIC ====================

export function paginateItems<T>(
  items: T[],
  config: PaginationConfig,
): PaginatedResult<T> {
  const { currentPage, itemsPerPage } = config;
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    totalItems,
    totalPages,
    currentPage,
    itemsPerPage,
    startIndex,
    endIndex: Math.min(endIndex, totalItems),
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

export function paginateProducts(
  products: ProductoResponse[],
  config: PaginationConfig,
): PaginatedResult<ProductoResponse> {
  return paginateItems(products, config);
}

// ==================== PAGE CALCULATIONS ====================

export function calculateTotalPages(
  totalItems: number,
  itemsPerPage: number,
): number {
  return Math.ceil(totalItems / itemsPerPage);
}

export function calculateStartIndex(
  currentPage: number,
  itemsPerPage: number,
): number {
  return (currentPage - 1) * itemsPerPage;
}

export function getNextPage(currentPage: number, totalPages: number): number {
  return Math.min(currentPage + 1, totalPages);
}

export function getPreviousPage(currentPage: number): number {
  return Math.max(currentPage - 1, 1);
}

export function isValidPage(page: number, totalPages: number): boolean {
  return page >= 1 && page <= totalPages;
}

// ==================== PAGE RANGE ====================

export interface PageRange {
  start: number;
  end: number;
  pages: number[];
}

export function calculatePageRange(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5,
): PageRange {
  if (totalPages <= maxVisible) {
    return {
      start: 1,
      end: totalPages,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
    };
  }

  const halfVisible = Math.floor(maxVisible / 2);
  let start = currentPage - halfVisible;
  let end = currentPage + halfVisible;

  if (start < 1) {
    start = 1;
    end = maxVisible;
  }

  if (end > totalPages) {
    end = totalPages;
    start = totalPages - maxVisible + 1;
  }

  return {
    start,
    end,
    pages: Array.from({ length: end - start + 1 }, (_, i) => start + i),
  };
}

// ==================== DISPLAY HELPERS ====================

export function formatPaginationSummary(
  startIndex: number,
  endIndex: number,
  totalItems: number,
): string {
  return `Mostrando ${startIndex + 1}-${endIndex} de ${totalItems}`;
}

export function formatResultsCount(count: number): string {
  return `${count} resultado${count === 1 ? "" : "s"}`;
}
