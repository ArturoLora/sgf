import { z } from "zod";
import type { Ubicacion, MetodoPago } from "../models/movimiento-inventario";
import type { MovimientoInventario } from "../models/movimiento-inventario";

// FASE 9B: TipoInventarioKardex es la fuente de verdad en lib/domain/shared/types.ts
// KardexInventoryType se mantiene como alias de compatibilidad pública — NO redefinir.
import type { TipoInventarioKardex } from "../../lib/domain/shared/types";

// ==================== ENUM LITERALS (frontera API) ====================
// Los valores literales duplican intencionalmente MetodoPago y Ubicacion del dominio.
// Esto endurece la frontera HTTP sin importar enums de dominio en la capa de validación.
// Si el dominio agrega valores, estos schemas deben actualizarse de forma explícita
// y consciente — ese acoplamiento explícito es el objetivo del hardening.

const METODO_PAGO_VALUES = [
  "CASH",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "TRANSFER",
] as const;

const UBICACION_VALUES = ["WAREHOUSE", "GYM"] as const;

// ==================== ZOD SCHEMAS ====================

export const MovementsQuerySchema = z.object({
  startDate: z.string().min(1, "startDate is required"),
  endDate: z.string().min(1, "endDate is required"),
});

export const CancelledSalesQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// F10-A8: paymentMethod era z.string() — reemplazado por z.enum con valores de MetodoPago.
// F10: Los campos numéricos opcionales (discount, surcharge, unitPrice) se mantienen opcionales
//      consistente con CrearVentaRequest donde son opcionales.
export const CreateSaleInputSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
  memberId: z.number().optional(),
  unitPrice: z.number().optional(),
  discount: z.number().optional(),
  surcharge: z.number().optional(),
  paymentMethod: z.enum(METODO_PAGO_VALUES),
  ticket: z.string(),
  shiftId: z.number().optional(),
  notes: z.string().optional(),
});

// F10-A9: location era z.string() — reemplazado por z.enum con valores de Ubicacion.
export const CreateEntryInputSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
  location: z.enum(UBICACION_VALUES),
  notes: z.string().optional(),
});

// F10-A10: destination era z.string() — reemplazado por z.enum con valores de Ubicacion.
export const CreateTransferInputSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
  destination: z.enum(UBICACION_VALUES),
  notes: z.string().optional(),
});

// F10-A11: location era z.string() — reemplazado por z.enum con valores de Ubicacion.
export const CreateAdjustmentInputSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
  location: z.enum(UBICACION_VALUES),
  notes: z.string(),
});

export const CancelSaleInputSchema = z.object({
  inventoryId: z.number(),
  cancellationReason: z.string(),
});

// ==================== INFERRED TYPES ====================

export type MovementsQueryInput = z.infer<typeof MovementsQuerySchema>;
export type CancelledSalesQueryInput = z.infer<
  typeof CancelledSalesQuerySchema
>;

// ==================== REQUEST TYPES ====================

export interface CrearVentaRequest {
  productId: number;
  quantity: number;
  memberId?: number;
  unitPrice?: number;
  discount?: number;
  surcharge?: number;
  paymentMethod: MetodoPago;
  ticket: string;
  shiftId?: number;
  notes?: string;
}

export interface CrearEntradaRequest {
  productId: number;
  quantity: number;
  location: Ubicacion;
  notes?: string;
}

export interface CrearTraspasoRequest {
  productId: number;
  quantity: number;
  destination: Ubicacion;
  notes?: string;
}

export interface CrearAjusteRequest {
  productId: number;
  quantity: number;
  location: Ubicacion;
  notes: string;
}

export interface CancelarVentaRequest {
  inventoryId: number;
  cancellationReason: string;
}

// ==================== DISCRIMINATED RESPONSE TYPES ====================

interface BaseMovimientoResponse {
  id: number;
  productId: number;
  userId: string;
  date: Date;
  createdAt: Date;
  user: {
    name: string;
  };
}

interface BaseVentaProduct {
  product: {
    name: string;
    salePrice?: number;
  };
}

interface BaseSimpleProduct {
  product: {
    name: string;
  };
}

export interface VentaResponse
  extends BaseMovimientoResponse, BaseVentaProduct {
  type: "SALE";
  location: "GYM";
  quantity: number;
  ticket: string;
  unitPrice: number;
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  paymentMethod: MetodoPago;
  memberId?: number;
  shiftId?: number;
  notes?: string;
  isCancelled: boolean;
  cancellationReason?: string;
  cancellationDate?: Date;
  member?: {
    memberNumber: string;
    name?: string;
  };
}

export interface EntradaResponse
  extends BaseMovimientoResponse, BaseSimpleProduct {
  type: "ENTRY";
  location: Ubicacion;
  quantity: number;
  notes?: string;
}

export interface TraspasoResponse
  extends BaseMovimientoResponse, BaseSimpleProduct {
  type: "TRANSFER";
  location: Ubicacion;
  quantity: number;
  notes: string;
}

export interface AjusteResponse
  extends BaseMovimientoResponse, BaseSimpleProduct {
  type: "ADJUSTMENT";
  location: Ubicacion;
  quantity: number;
  notes: string;
}

export type MovimientoInventarioResponse =
  | VentaResponse
  | EntradaResponse
  | TraspasoResponse
  | AjusteResponse;

// ==================== KARDEX TYPES ====================

// FASE 9B [ALTA-1]: KardexInventoryType era una redefinición de TipoInventarioKardex.
// Se elimina la definición local. El alias re-exporta el tipo canónico del dominio.
// Contratos existentes que importen KardexInventoryType NO se rompen.
export type KardexInventoryType = TipoInventarioKardex;

export interface KardexMovimientoResponse {
  id: number;
  type: KardexInventoryType;
  location: Ubicacion;
  quantity: number;
  balance: number;
  ticket?: string;
  unitPrice?: number;
  total?: number;
  paymentMethod?: MetodoPago;
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
}

// ==================== QUERY PARAMS ====================

export interface ObtenerMovimientosQuery {
  startDate: string;
  endDate: string;
}

export interface ObtenerVentasCanceladasQuery {
  startDate?: string;
  endDate?: string;
}

// ==================== INTERNAL TYPES ====================

export interface VentaCreada extends MovimientoInventario {
  product: {
    name: string;
  };
  member?: {
    memberNumber: string;
    name?: string;
  };
  user: {
    name: string;
  };
}

export interface EntradaCreada extends MovimientoInventario {
  product: {
    name: string;
  };
  user: {
    name: string;
  };
}

export interface TraspasoCreado extends MovimientoInventario {
  product: {
    name: string;
  };
  user: {
    name: string;
  };
}

export interface AjusteCreado extends MovimientoInventario {
  product: {
    name: string;
  };
  user: {
    name: string;
  };
}

export interface VentaCancelada extends MovimientoInventario {
  product: {
    name: string;
  };
  member?: {
    memberNumber: string;
    name?: string;
  };
}
