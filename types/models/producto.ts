export interface Producto {
  id: number;
  name: string;
  salePrice: number;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductoConRelaciones extends Producto {
  inventoryMovements: MovimientoInventario[];
}

import type { MovimientoInventario } from "./movimiento-inventario";
