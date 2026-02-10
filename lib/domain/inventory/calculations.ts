// lib/domain/inventory/calculations.ts

import type { KardexMovimientoResponse } from "@/types/api/inventory";

export interface StockStats {
  totalProductos: number;
  stockBajo: number;
  sinStock: number;
  valorTotal: number;
  stockTotalGym: number;
  stockTotalBodega: number;
}

export interface Producto {
  id: number;
  name: string;
  salePrice: number;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
}

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
  movimientos: KardexMovimientoResponse[],
): KardexMovimientoResponse[] {
  let balance = 0;
  const withBalance: KardexMovimientoResponse[] = [];

  for (const mov of movimientos) {
    balance += mov.quantity;
    withBalance.push({ ...mov, balance });
  }

  return withBalance;
}
