import { z } from "zod";
import type { MetodoPago } from "../models/movimiento-inventario";

// FASE 9B [MEDIA-1]: ResumenCorteResponse es alias del tipo canónico del dominio.
import type { ResumenCorte as _ResumenCorteDomain } from "../../lib/domain/shifts/types";

// ==================== ZOD SCHEMAS ====================

export const ShiftsQuerySchema = z.object({
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cashier: z.string().optional(),
  status: z.string().optional(),
  orderBy: z.string().optional(),
  order: z.string().optional(),
  page: z.string().optional(),
  perPage: z.string().optional(),
});

export const OpenShiftSchema = z.object({
  initialCash: z.number().min(0, "El fondo inicial debe ser mayor o igual a 0"),
  notes: z.string().optional(),
});

export const CloseShiftSchema = z.object({
  shiftId: z.number(),
  cashAmount: z.number().min(0).optional(),
  debitCardAmount: z.number().min(0).optional(),
  creditCardAmount: z.number().min(0).optional(),
  totalWithdrawals: z.number().min(0).optional(),
  withdrawalsConcept: z.string().optional(),
  difference: z.number().optional(),
  notes: z.string().optional(),
});

// ==================== INFERRED TYPES ====================

export type ShiftsQueryInput = z.infer<typeof ShiftsQuerySchema>;
export type OpenShiftInput = z.infer<typeof OpenShiftSchema>;
export type CloseShiftInput = z.infer<typeof CloseShiftSchema>;

// ==================== QUERY PARAMS ====================

export interface BuscarCortesQuery {
  search?: string;
  startDate?: string;
  endDate?: string;
  cashier?: string;
  status?: string;
  orderBy?: string;
  order?: string;
  page?: string;
  perPage?: string;
}

// ==================== REQUEST TYPES ====================

export interface AbrirCorteRequest {
  initialCash: number;
  notes?: string;
}

// F10-A12/A13: cashAmount, debitCardAmount, creditCardAmount y difference
// alineados como opcionales con CloseShiftSchema y el comportamiento
// real del service (usa || 0 y calcula difference cuando no viene en el payload).
export interface CerrarCorteRequest {
  shiftId: number;
  cashAmount?: number;
  debitCardAmount?: number;
  creditCardAmount?: number;
  totalWithdrawals?: number;
  withdrawalsConcept?: string;
  difference?: number;
  notes?: string;
}

// ==================== DISCRIMINATED RESPONSE TYPES ====================

interface BaseCorteResponse {
  id: number;
  folio: string;
  cashierId: string;
  openingDate: Date;
  initialCash: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  cashier: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CorteActivoResponse extends BaseCorteResponse {
  status: "OPEN";
}

export interface CorteCerradoResponse extends BaseCorteResponse {
  status: "CLOSED";
  closingDate: Date;
  ticketCount: number;
  membershipSales: number;
  productSales0Tax: number;
  productSales16Tax: number;
  subtotal: number;
  tax: number;
  totalSales: number;
  cashAmount: number;
  debitCardAmount: number;
  creditCardAmount: number;
  totalVoucher: number;
  totalWithdrawals: number;
  withdrawalsConcept?: string;
  cancelledSales: number;
  totalCash: number;
  difference: number;
}

export type CorteResponse = CorteActivoResponse | CorteCerradoResponse;

// ==================== EXTENDED RESPONSE TYPES ====================

export interface CorteActivoConVentasResponse extends CorteActivoResponse {
  inventoryMovements: Array<{
    id: number;
    type: string;
    quantity: number;
    ticket?: string;
    total: number;
    paymentMethod?: MetodoPago;
    date: Date;
    product: {
      name: string;
    };
    member?: {
      memberNumber: string;
      name?: string;
    };
  }>;
}

export interface CorteCerradoConVentasResponse extends CorteCerradoResponse {
  inventoryMovements: Array<{
    id: number;
    type: string;
    quantity: number;
    ticket?: string;
    total: number;
    paymentMethod?: MetodoPago;
    date: Date;
    product: {
      name: string;
    };
    member?: {
      memberNumber: string;
      name?: string;
    };
  }>;
}

export type CorteConVentasResponse =
  | CorteActivoConVentasResponse
  | CorteCerradoConVentasResponse;

// ==================== SUMMARY TYPES ====================

// FASE 9B [MEDIA-1]: alias del tipo canónico del dominio.
export type ResumenCorteResponse = _ResumenCorteDomain;

export interface ListaCortesResponse {
  shifts: CorteResponse[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface EstadisticasCortesResponse {
  totalShifts: number;
  totalSales: number;
  averageSales: number;
  totalDifferences: number;
}

export interface ResumenVentasPorProducto {
  product: string;
  quantity: number;
  total: number;
}

export interface ResumenPorFormaPago {
  CASH: number;
  DEBIT_CARD: number;
  CREDIT_CARD: number;
  TRANSFER: number;
}
