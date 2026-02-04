import { z } from "zod";
import type { MetodoPago } from "../models/movimiento-inventario";

// ==================== ZOD SCHEMAS ====================

export const TicketParamsSchema = z.object({
  ticket: z.string(),
});

// Schema para filtros de historial de ventas
export const HistorialVentasFiltersSchema = z.object({
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cashier: z.string().optional(),
  product: z.string().optional(),
  member: z.string().optional(),
  paymentMethod: z.string().optional(),
  productType: z.enum(["todos", "membresias", "productos"]).optional(),
  orderBy: z
    .enum([
      "date_desc",
      "date_asc",
      "total_desc",
      "total_asc",
      "ticket_desc",
      "ticket_asc",
    ])
    .optional(),
  onlyActive: z.boolean().optional(),
});

// ==================== INFERRED TYPES ====================

export type TicketParamsInput = z.infer<typeof TicketParamsSchema>;
export type HistorialVentasFilters = z.infer<
  typeof HistorialVentasFiltersSchema
>;

// ==================== QUERY PARAMS ====================

export interface ObtenerHistorialVentasQuery {
  startDate?: string;
  endDate?: string;
  cashier?: string;
  product?: string;
  member?: string;
  paymentMethod?: string;
  onlyActive?: string;
  productType?: string;
  search?: string;
  orderBy?: string;
  order?: string;
  page?: string;
  perPage?: string;
}

// ==================== RESPONSE TYPES ====================

export interface ProductoVentaResponse {
  id: number;
  name: string;
  salePrice: number;
  gymStock: number;
  warehouseStock: number;
  totalStock: number;
}

export interface ItemVentaTicket {
  id: number;
  product: {
    name: string;
  };
  quantity: number;
  total: number;
}

export interface TicketVentaAgrupado {
  ticket: string;
  date: Date;
  total: number;
  paymentMethod?: MetodoPago;
  cashier: string;
  member?: {
    memberNumber: string;
    name?: string;
  };
  isCancelled: boolean;
  items: ItemVentaTicket[];
}

export interface HistorialVentasResponse {
  tickets: TicketVentaAgrupado[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface DetalleTicketResponse {
  ticket: string;
  date: Date;
  cashier: string;
  paymentMethod?: MetodoPago;
  member?: {
    memberNumber: string;
    name?: string;
  };
  isCancelled: boolean;
  cancellationReason?: string;
  cancellationDate?: Date;
  notes?: string;
  total: number;
  items: ItemVentaTicket[];
}

// ==================== HELPER TYPES ====================

export interface CashierOption {
  id: string;
  name: string;
}

export interface ProductOption {
  id: number;
  name: string;
}

export interface MemberOption {
  id: number;
  memberNumber: string;
  name: string | null;
}
