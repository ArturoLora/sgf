import { z } from "zod";
import type { Ubicacion } from "../models/movimiento-inventario";

// ==================== ZOD SCHEMAS ====================

export const ProductsQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.string().optional(),
  lowStock: z.string().optional(),
});

export const CreateProductInputSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  salePrice: z.number().positive("El precio debe ser mayor a 0"),
  minStock: z
    .number()
    .int()
    .min(0, "El stock mínimo no puede ser negativo")
    .optional(),
});

export const UpdateProductInputSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  salePrice: z.number().positive("El precio debe ser mayor a 0").optional(),
  minStock: z
    .number()
    .int()
    .min(0, "El stock mínimo no puede ser negativo")
    .optional(),
  isActive: z.boolean().optional(),
});

// ==================== INFERRED TYPES ====================

export type ProductsQueryInput = z.infer<typeof ProductsQuerySchema>;
export type CreateProductInputRaw = z.infer<typeof CreateProductInputSchema>;
export type UpdateProductInputRaw = z.infer<typeof UpdateProductInputSchema>;

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
