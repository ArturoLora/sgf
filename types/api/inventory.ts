import type {
  TipoInventario,
  Ubicacion,
  MetodoPago,
} from "../models/movimiento-inventario";
import type {
  MovimientoInventario,
  MovimientoInventarioConRelaciones,
} from "../models/movimiento-inventario";

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

// ==================== RESPONSE TYPES ====================

export interface MovimientoInventarioResponse {
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
  product: {
    name: string;
    salePrice?: number;
  };
  member?: {
    memberNumber: string;
    name?: string;
  };
  user: {
    name: string;
  };
}

export interface KardexMovimientoResponse {
  id: number;
  type: TipoInventario;
  location: Ubicacion;
  quantity: number;
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
