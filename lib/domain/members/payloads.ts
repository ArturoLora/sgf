// lib/domain/members/payloads.ts
// Constructores puros de payloads para socios
// SIN dependencias externas (no @/types/api, no Prisma, no @/types/models)

import type {
  CrearSocioInput,
  ActualizarSocioInput,
  RenovarMembresiaInput,
} from "./types";
import { TIPOS_MEMBRESIA } from "./types";

// ==================== VALID VALUE SETS ====================

const METODOS_PAGO_VALIDOS = new Set([
  "CASH",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "TRANSFER",
]);

const TIPOS_MEMBRESIA_VALIDOS = new Set(TIPOS_MEMBRESIA.map((t) => t.value));

// ==================== TYPE GUARDS ====================

function isMetodoPagoValido(value: string | undefined): boolean {
  return value !== undefined && METODOS_PAGO_VALIDOS.has(value);
}

function isTipoMembresiaValido(value: string | undefined): boolean {
  return value !== undefined && TIPOS_MEMBRESIA_VALIDOS.has(value);
}

// ==================== PAYLOAD BUILDERS ====================

export function buildCrearSocioPayload(data: CrearSocioInput): CrearSocioInput {
  return {
    memberNumber: data.memberNumber,
    name: data.name || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    birthDate: data.birthDate || undefined,
    membershipType: isTipoMembresiaValido(data.membershipType)
      ? data.membershipType
      : undefined,
    membershipDescription: data.membershipDescription || undefined,
    startDate: data.startDate || undefined,
    endDate: data.endDate || undefined,
    paymentMethod: isMetodoPagoValido(data.paymentMethod)
      ? data.paymentMethod
      : undefined,
  };
}

export function buildActualizarSocioPayload(
  data: ActualizarSocioInput,
): ActualizarSocioInput {
  return {
    name: data.name || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    birthDate: data.birthDate || undefined,
    membershipType: isTipoMembresiaValido(data.membershipType)
      ? data.membershipType
      : undefined,
    membershipDescription: data.membershipDescription || undefined,
    startDate: data.startDate || undefined,
    endDate: data.endDate || undefined,
    isActive: data.isActive,
  };
}

export function buildRenovarMembresiaPayload(
  data: RenovarMembresiaInput,
): RenovarMembresiaInput {
  if (!isTipoMembresiaValido(data.membershipType)) {
    throw new Error(`Tipo de membresía inválido: ${data.membershipType}`);
  }

  return {
    memberId: data.memberId,
    membershipType: data.membershipType,
    membershipDescription: data.membershipDescription || undefined,
    startDate: data.startDate || undefined,
    paymentMethod: isMetodoPagoValido(data.paymentMethod)
      ? data.paymentMethod
      : undefined,
  };
}
