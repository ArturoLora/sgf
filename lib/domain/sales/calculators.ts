// lib/domain/sales/calculators.ts
// Funciones puras de cálculo para ventas (POS)
// SIN dependencias externas

import type { ItemCarrito } from "./types";

/**
 * Calcula el subtotal de un carrito de compras
 */
export function calculateSubtotal(carrito: ItemCarrito[]): number {
  return carrito.reduce(
    (sum, item) => sum + item.precioUnitario * item.cantidad,
    0,
  );
}

/**
 * Calcula el total de una venta aplicando descuentos y recargos
 */
export function calculateTotal(
  subtotal: number,
  descuento: number,
  recargo: number,
): number {
  return subtotal - descuento + recargo;
}
