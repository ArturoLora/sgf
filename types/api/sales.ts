import type { MetodoPago } from "../models/movimiento-inventario";

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
