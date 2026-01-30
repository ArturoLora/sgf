import type { Producto } from "../models/producto";
import type { Ubicacion } from "../models/movimiento-inventario";

// ==================== QUERY PARAMS ====================

export interface BuscarProductosQuery {
  search?: string;
  isActive?: string;
  lowStock?: string;
}

// ==================== REQUEST TYPES ====================

export interface CrearProductoRequest {
  name: string;
  salePrice: number;
  minStock?: number;
}

export interface ActualizarProductoRequest {
  name?: string;
  salePrice?: number;
  minStock?: number;
  isActive?: boolean;
}

// ==================== RESPONSE TYPES ====================

export interface ProductoResponse {
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

export interface ProductoConMovimientosResponse extends ProductoResponse {
  inventoryMovements: Array<{
    id: number;
    type: string;
    location: Ubicacion;
    quantity: number;
    ticket?: string;
    unitPrice?: number;
    total?: number;
    notes?: string;
    isCancelled: boolean;
    date: Date;
    user: {
      name: string;
    };
    member?: {
      memberNumber: string;
      name?: string;
    };
  }>;
}

export interface StockProductoResponse {
  warehouse: number;
  gym: number;
  total: number;
}

export interface EstadisticasProductosResponse {
  total: number;
  active: number;
  lowStockGym: number;
  lowStockWarehouse: number;
  inventoryValue: number;
}

export interface ProductoBajoStockResponse {
  id: number;
  name: string;
  gymStock: number;
  warehouseStock: number;
  minStock: number;
  stockFaltante: {
    gym: number;
    warehouse: number;
  };
}
