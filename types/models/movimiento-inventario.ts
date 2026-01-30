export enum TipoInventario {
  SALE = "SALE",
  ADJUSTMENT = "ADJUSTMENT",
  WAREHOUSE_ENTRY = "WAREHOUSE_ENTRY",
  GYM_ENTRY = "GYM_ENTRY",
  TRANSFER_TO_GYM = "TRANSFER_TO_GYM",
  TRANSFER_TO_WAREHOUSE = "TRANSFER_TO_WAREHOUSE",
}

export enum Ubicacion {
  WAREHOUSE = "WAREHOUSE",
  GYM = "GYM",
}

export enum MetodoPago {
  CASH = "CASH",
  DEBIT_CARD = "DEBIT_CARD",
  CREDIT_CARD = "CREDIT_CARD",
  TRANSFER = "TRANSFER",
}

export interface MovimientoInventario {
  id: number;
  productId: number;
  type: TipoInventario;
  location: Ubicacion;
  quantity: number;
  ticket?: string;
  memberId?: number;
  userId: string;
  unitPrice?: number;
  subtotal?: number;
  discount?: number;
  surcharge?: number;
  total?: number;
  paymentMethod?: MetodoPago;
  shiftId?: number;
  notes?: string;
  isCancelled: boolean;
  cancellationReason?: string;
  cancellationDate?: Date;
  date: Date;
  createdAt: Date;
}

export interface MovimientoInventarioConRelaciones extends MovimientoInventario {
  product: Producto;
  member?: Socio;
  user: Usuario;
  shift?: Corte;
}

import type { Producto } from "./producto";
import type { Socio } from "./socio";
import type { Usuario } from "./usuario";
import type { Corte } from "./corte";
