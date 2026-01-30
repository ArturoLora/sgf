import type { TipoMembresia } from "../models/socio";
import type { Socio } from "../models/socio";
import type { MetodoPago } from "../models/movimiento-inventario";

// ==================== QUERY PARAMS ====================

export interface BuscarSociosQuery {
  search?: string;
  isActive?: string;
  membershipType?: string;
}

// ==================== REQUEST TYPES ====================

export interface CrearSocioRequest {
  memberNumber: string;
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  membershipType?: TipoMembresia;
  membershipDescription?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: MetodoPago;
}

export interface ActualizarSocioRequest {
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  membershipType?: TipoMembresia;
  membershipDescription?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface RenovarMembresiaRequest {
  memberId: number;
  membershipType: TipoMembresia;
  membershipDescription?: string;
  startDate?: string;
  paymentMethod?: MetodoPago;
}

// ==================== RESPONSE TYPES ====================

export interface SocioResponse {
  id: number;
  memberNumber: string;
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: Date;
  membershipType?: TipoMembresia;
  membershipDescription?: string;
  startDate?: Date;
  endDate?: Date;
  totalVisits: number;
  lastVisit?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocioConHistorialResponse extends SocioResponse {
  inventoryMovements: Array<{
    id: number;
    type: string;
    quantity: number;
    total: number;
    date: Date;
    product: {
      name: string;
      salePrice: number;
    };
  }>;
}

export interface VigenciaMembresiaResponse {
  isValid: boolean;
  daysRemaining: number;
  endDate: Date | null;
}

export interface SocioVencidoResponse {
  id: number;
  memberNumber: string;
  name?: string;
  membershipType?: TipoMembresia;
  endDate?: Date;
  daysExpired: number;
}
