// lib/domain/products/helpers.ts
// Helpers puros para el dominio de productos
// SIN dependencias externas

import type { Producto } from "./types";
import { paginar, calcularPaginasVisibles } from "../shared/pagination";

const MEMBERSHIP_PATTERNS = [
  "EFECTIVO",
  "VISITA",
  "MENSUALIDAD",
  "SEMANA",
] as const;

export function isMembership(product: Producto): boolean {
  return MEMBERSHIP_PATTERNS.some(
    (pattern) => product.name.includes(pattern) || product.name === pattern,
  );
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

// Re-export paginación desde shared para compatibilidad
export { paginar as paginate, calcularPaginasVisibles as computePageNumbers };
export type { ResultadoPaginacion as PaginationResult } from "../shared/pagination";
