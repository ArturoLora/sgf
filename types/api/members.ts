import { z } from "zod";
import type { TipoMembresia } from "../models/socio";
import type { MetodoPago } from "../models/movimiento-inventario";

// ==================== ZOD SCHEMAS ====================

export const MembersQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.string().optional(),
  membershipType: z.string().optional(),
});

export const CreateMemberInputSchema = z.object({
  memberNumber: z.string(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  birthDate: z.string().optional(),
  membershipType: z.string().optional(),
  membershipDescription: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentMethod: z
    .enum(["CASH", "DEBIT_CARD", "CREDIT_CARD", "TRANSFER"])
    .optional(),
});

export const UpdateMemberInputSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  birthDate: z.string().optional(),
  membershipType: z.string().optional(),
  membershipDescription: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const RenewMemberInputSchema = z.object({
  memberId: z.number(),
  membershipType: z.string(),
  membershipDescription: z.string().optional(),
  startDate: z.string().optional(),
  paymentMethod: z
    .enum(["CASH", "DEBIT_CARD", "CREDIT_CARD", "TRANSFER"])
    .optional(),
});

// ==================== INFERRED TYPES ====================

export type MembersQueryInput = z.infer<typeof MembersQuerySchema>;
export type CreateMemberInputRaw = z.infer<typeof CreateMemberInputSchema>;
export type UpdateMemberInputRaw = z.infer<typeof UpdateMemberInputSchema>;
export type RenewMemberInputRaw = z.infer<typeof RenewMemberInputSchema>;

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
