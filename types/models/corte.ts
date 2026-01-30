export interface Corte {
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
}

export interface CorteConRelaciones extends Corte {
  cashier: Usuario;
  inventoryMovements: MovimientoInventario[];
}

import type { Usuario } from "./usuario";
import type { MovimientoInventario } from "./movimiento-inventario";
