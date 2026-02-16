import type { ProductoResponse } from "@/types/api/products";

const MEMBERSHIP_PATTERNS = [
  "EFECTIVO",
  "VISITA",
  "MENSUALIDAD",
  "SEMANA",
] as const;

export function isMembership(product: ProductoResponse): boolean {
  return MEMBERSHIP_PATTERNS.some(
    (pattern) => product.name.includes(pattern) || product.name === pattern,
  );
}

export interface PaginationResult<T> {
  items: T[];
  totalPages: number;
  startIndex: number;
  endIndex: number;
  total: number;
}

export function paginate<T>(
  items: T[],
  page: number,
  perPage: number,
): PaginationResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / perPage);
  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const startIndex = (safePage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, total);

  return {
    items: items.slice(startIndex, endIndex),
    totalPages,
    startIndex,
    endIndex,
    total,
  };
}

export function computePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5,
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);

  if (currentPage <= half + 1) {
    return Array.from({ length: maxVisible }, (_, i) => i + 1);
  }

  if (currentPage >= totalPages - half) {
    return Array.from(
      { length: maxVisible },
      (_, i) => totalPages - maxVisible + 1 + i,
    );
  }

  return Array.from({ length: maxVisible }, (_, i) => currentPage - half + i);
}

export function locationLabel(location: string): string {
  return location === "WAREHOUSE" ? "Bodega" : "Gym";
}

export function movementTypeLabel(type: string): string {
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
