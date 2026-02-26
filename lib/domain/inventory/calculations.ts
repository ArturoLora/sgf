// lib/domain/inventory/calculations.ts
// Funciones puras de cálculo para inventario
// SIN dependencias externas

import type { TipoInventarioKardex, Ubicacion } from "../shared/types";
import type { Producto } from "../products/types";

// ==================== TIPOS INTERNOS ====================

export interface KardexMovimiento {
  id: number;
  type: TipoInventarioKardex;
  location: Ubicacion;
  quantity: number;
  balance?: number;
  ticket?: string;
  unitPrice?: number;
  total?: number;
  paymentMethod?: string;
  notes?: string;
  isCancelled: boolean;
  date: Date | string;
  user: { name: string };
  member?: { memberNumber: string; name?: string } | null;
}

export interface StockStats {
  totalProductos: number;
  stockBajo: number;
  sinStock: number;
  valorTotal: number;
  stockTotalGym: number;
  stockTotalBodega: number;
}

// ==================== CÁLCULOS ====================

export function calcularStatsInventario(productos: Producto[]): StockStats {
  const totalProductos = productos.length;

  const stockBajo = productos.filter(
    (p) => p.gymStock < p.minStock || p.warehouseStock < p.minStock,
  ).length;

  const sinStock = productos.filter(
    (p) => p.warehouseStock + p.gymStock === 0,
  ).length;

  const valorTotal = productos.reduce((sum, p) => {
    return sum + Number(p.salePrice) * (p.warehouseStock + p.gymStock);
  }, 0);

  const stockTotalGym = productos.reduce((sum, p) => sum + p.gymStock, 0);

  const stockTotalBodega = productos.reduce(
    (sum, p) => sum + p.warehouseStock,
    0,
  );

  return {
    totalProductos,
    stockBajo,
    sinStock,
    valorTotal,
    stockTotalGym,
    stockTotalBodega,
  };
}

export function calcularStockTotal(producto: Producto): number {
  return producto.warehouseStock + producto.gymStock;
}

export function calcularValorProducto(producto: Producto): number {
  const stockTotal = calcularStockTotal(producto);
  return Number(producto.salePrice) * stockTotal;
}

export function calcularBalance(
  movimientos: KardexMovimiento[],
): KardexMovimiento[] {
  let balance = 0;
  const withBalance: KardexMovimiento[] = [];

  for (const mov of movimientos) {
    balance += mov.quantity;
    withBalance.push({ ...mov, balance });
  }

  return withBalance;
}

export function validarStockDisponible(
  producto: Pick<Producto, "gymStock" | "warehouseStock">,
  cantidad: number,
  ubicacion: Ubicacion,
): void {
  const stockActual =
    ubicacion === "WAREHOUSE" ? producto.warehouseStock : producto.gymStock;

  if (stockActual < cantidad) {
    throw new Error(
      `Stock insuficiente en ${ubicacion}. Disponible: ${stockActual}, Solicitado: ${cantidad}`,
    );
  }
}
