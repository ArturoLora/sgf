import type {
  CreateMemberInputRaw,
  UpdateMemberInputRaw,
  RenewMemberInputRaw,
  CrearSocioRequest,
  ActualizarSocioRequest,
  RenovarMembresiaRequest,
} from "@/types/api/members";
import { MetodoPago } from "@/types/models/movimiento-inventario";
import type { TipoMembresia } from "@/types/models/socio";

// ==================== TYPE GUARDS ====================

const METODOS_PAGO: ReadonlySet<string> = new Set(Object.values(MetodoPago));

function isMetodoPago(value: string | undefined): value is MetodoPago {
  return value !== undefined && METODOS_PAGO.has(value);
}

/**
 * All valid TipoMembresia values matching the enum defined in types/models/socio.
 * Kept in sync with the TIPOS_MEMBRESIA constant in types.ts.
 */
const TIPOS_MEMBRESIA_VALIDOS: ReadonlySet<string> = new Set([
  "VISIT",
  "WEEK",
  "MONTH_STUDENT",
  "MONTH_GENERAL",
  "QUARTER_STUDENT",
  "QUARTER_GENERAL",
  "ANNUAL_STUDENT",
  "ANNUAL_GENERAL",
  "PROMOTION",
  "REBIRTH",
  "NUTRITION_CONSULTATION",
]);

function isTipoMembresia(value: string | undefined): value is TipoMembresia {
  return value !== undefined && TIPOS_MEMBRESIA_VALIDOS.has(value);
}

// ==================== PAYLOAD BUILDERS ====================

export function buildCrearSocioPayload(
  data: CreateMemberInputRaw,
): CrearSocioRequest {
  return {
    memberNumber: data.memberNumber,
    name: data.name || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    birthDate: data.birthDate || undefined,
    membershipType: isTipoMembresia(data.membershipType)
      ? data.membershipType
      : undefined,
    membershipDescription: data.membershipDescription || undefined,
    startDate: data.startDate || undefined,
    endDate: data.endDate || undefined,
    paymentMethod: isMetodoPago(data.paymentMethod)
      ? data.paymentMethod
      : undefined,
  };
}

export function buildActualizarSocioPayload(
  data: UpdateMemberInputRaw,
): ActualizarSocioRequest {
  return {
    name: data.name || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    birthDate: data.birthDate || undefined,
    membershipType: isTipoMembresia(data.membershipType)
      ? data.membershipType
      : undefined,
    membershipDescription: data.membershipDescription || undefined,
    startDate: data.startDate || undefined,
    endDate: data.endDate || undefined,
    isActive: data.isActive,
  };
}

export function buildRenovarMembresiaPayload(
  data: RenewMemberInputRaw,
): RenovarMembresiaRequest {
  if (!isTipoMembresia(data.membershipType)) {
    throw new Error(`Tipo de membresía inválido: ${data.membershipType}`);
  }

  return {
    memberId: data.memberId,
    membershipType: data.membershipType,
    membershipDescription: data.membershipDescription || undefined,
    startDate: data.startDate || undefined,
    paymentMethod: isMetodoPago(data.paymentMethod)
      ? data.paymentMethod
      : undefined,
  };
}
