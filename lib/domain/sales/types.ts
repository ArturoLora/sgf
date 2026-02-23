// lib/domain/sales/types.ts
// Tipos internos del dominio de ventas
// SIN dependencias externas (no @/types/api, no Prisma)

import type { MetodoPago } from "../shared/types";

// ==================== CARRITO ====================

export interface ItemCarrito {
  producto: {
    id: number;
    nombre: string;
    precioVenta: number;
    existenciaGym: number;
  };
  cantidad: number;
  precioUnitario: number;
}

// ==================== PAYLOAD DE VENTA ====================

export interface CrearVentaPayload {
  productId: number;
  quantity: number;
  memberId?: number;
  unitPrice: number;
  discount: number;
  surcharge: number;
  paymentMethod: MetodoPago;
  ticket: string;
  shiftId?: number;
  notes?: string;
}

// ==================== METADATA DE VENTA ====================

export interface SaleMetadata {
  clienteId: number | null;
  descuento: number;
  recargo: number;
  metodoPago: MetodoPago;
  ticket: string;
}

// ==================== FILTROS DE HISTORIAL ====================

export interface HistorialVentasFilters {
  search: string;
  startDate: string;
  endDate: string;
  cashier: string;
  product: string;
  member: string;
  paymentMethod: string;
  productType: string;
  orderBy: string;
  onlyActive: boolean;
}

// ==================== TICKET AGRUPADO ====================

export interface ItemTicket {
  id: number;
  product: { name: string };
  quantity: number;
  total: number;
}

export interface TicketAgrupado {
  ticket: string;
  date: Date | string;
  total: number;
  paymentMethod?: string;
  cashier: string;
  member?: {
    memberNumber: string;
    name?: string | null;
  } | null;
  isCancelled: boolean;
  items: ItemTicket[];
}

// ==================== ESTADÍSTICAS DE HISTORIAL ====================

export interface HistorialStats {
  totalValue: number;
  uniqueTickets: number;
  cancelled: number;
  totalItems: number;
}
