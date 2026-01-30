import type { Corte } from "../models/corte";
import type { MetodoPago } from "../models/movimiento-inventario";

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

export interface CerrarCorteRequest {
  shiftId: number;
  cashAmount: number;
  debitCardAmount: number;
  creditCardAmount: number;
  totalWithdrawals?: number;
  withdrawalsConcept?: string;
  difference: number;
  notes?: string;
}

// ==================== RESPONSE TYPES ====================

export interface CorteResponse {
  id: number;
  folio: string;
  cashierId: string;
  openingDate: Date;
  closingDate?: Date;
  initialCash: number;
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
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  cashier: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CorteConVentasResponse extends CorteResponse {
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

export interface ResumenCorteResponse {
  initialCash: number;
  ticketCount: number;
  totalSales: number;
  cashAmount: number;
  debitCardAmount: number;
  creditCardAmount: number;
  totalWithdrawals: number;
}

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
