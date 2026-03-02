import { z } from "zod";
import type { Ubicacion } from "../models/movimiento-inventario";

// FASE 9B [ALTA-2]: ProductoBajoStockResponse estaba duplicado entre
// types/api/products.ts y lib/domain/reports/types.ts (ProductoBajoStock).
// Fuente de verdad semántica: lib/domain/reports/types.ts (ProductoBajoStock).
// Este DTO re-exporta la forma del dominio sin redefinirla.
//
// FASE 9B [MEDIA-2]: ProductoResponse vs lib/domain/products/types.ts (Producto).
// ProductoResponse es un DTO de frontera legítimo: agrega createdAt/updatedAt
// que la entidad de dominio marca como opcionales. Se mantiene como DTO propio
// pero se documenta la relación para evitar drift futuro.
//
// FASE 9B [MEDIA-3]: EstadisticasProductosResponse vs lib/domain/products/types.ts (ProductStats).
// ProductStats (dominio) = { totalProducts, activeProducts, lowStockProducts, inventoryValue }.
// EstadisticasProductosResponse agrega lowStockGym/lowStockWarehouse diferenciados → extensión legítima.
// Se documenta la deuda para revisión futura si el dominio absorbe ese detalle.

import type { ProductoBajoStock } from "../../lib/domain/reports/types";

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

// DEUDA [MEDIA-2]: ProductoResponse extiende implícitamente Producto del dominio.
// Diferencias intencionales: createdAt/updatedAt son obligatorios aquí (el dominio los marca opcionales).
// Si el dominio evoluciona para requerirlos, este DTO puede simplificarse a alias.
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

// DEUDA [MEDIA-3]: EstadisticasProductosResponse extiende ProductStats del dominio.
// ProductStats = { totalProducts, activeProducts, lowStockProducts, inventoryValue }.
// Este DTO agrega lowStockGym y lowStockWarehouse (desglose por ubicación) — extensión legítima.
// Relación: total ↔ totalProducts, active ↔ activeProducts, inventoryValue ↔ inventoryValue.
export interface EstadisticasProductosResponse {
  total: number;
  active: number;
  lowStockGym: number;
  lowStockWarehouse: number;
  inventoryValue: number;
}

// FASE 9B [ALTA-2]: ProductoBajoStockResponse es alias del tipo canónico del dominio.
// lib/domain/reports/types.ts#ProductoBajoStock es la única definición semántica.
// El alias mantiene el nombre público del contrato API sin duplicar la estructura.
export type ProductoBajoStockResponse = ProductoBajoStock;
