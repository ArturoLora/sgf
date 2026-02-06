// services/enum-mappers.ts
import type {
  InventoryType,
  Location,
  PaymentMethod,
  MembershipType,
} from "@prisma/client";
import {
  TipoInventario,
  Ubicacion,
  MetodoPago,
  TipoMembresia,
} from "@/types/models";
import type { KardexInventoryType } from "@/types/api/inventory";

// ==================== INVENTORY TYPE MAPPING ====================

export function mapInventoryType(type: InventoryType): TipoInventario {
  switch (type) {
    case "SALE":
      return TipoInventario.SALE;
    case "ADJUSTMENT":
      return TipoInventario.ADJUSTMENT;
    case "WAREHOUSE_ENTRY":
      return TipoInventario.WAREHOUSE_ENTRY;
    case "GYM_ENTRY":
      return TipoInventario.GYM_ENTRY;
    case "TRANSFER_TO_GYM":
      return TipoInventario.TRANSFER_TO_GYM;
    case "TRANSFER_TO_WAREHOUSE":
      return TipoInventario.TRANSFER_TO_WAREHOUSE;
    default:
      throw new Error(`Unknown InventoryType: ${type}`);
  }
}

// ==================== KARDEX INVENTORY TYPE MAPPING ====================

export function mapInventoryTypeToKardex(
  type: InventoryType,
): KardexInventoryType {
  switch (type) {
    case "SALE":
      return "SALE";
    case "ADJUSTMENT":
      return "ADJUSTMENT";
    case "WAREHOUSE_ENTRY":
    case "GYM_ENTRY":
      return "ENTRY";
    case "TRANSFER_TO_GYM":
    case "TRANSFER_TO_WAREHOUSE":
      return "TRANSFER";
    default:
      throw new Error(`Unknown InventoryType: ${type}`);
  }
}

// ==================== LOCATION MAPPING ====================

export function mapLocation(location: Location): Ubicacion {
  switch (location) {
    case "WAREHOUSE":
      return Ubicacion.WAREHOUSE;
    case "GYM":
      return Ubicacion.GYM;
    default:
      throw new Error(`Unknown Location: ${location}`);
  }
}

// ==================== PAYMENT METHOD MAPPING ====================

export function mapPaymentMethod(method: PaymentMethod): MetodoPago {
  switch (method) {
    case "CASH":
      return MetodoPago.CASH;
    case "DEBIT_CARD":
      return MetodoPago.DEBIT_CARD;
    case "CREDIT_CARD":
      return MetodoPago.CREDIT_CARD;
    case "TRANSFER":
      return MetodoPago.TRANSFER;
    default:
      throw new Error(`Unknown PaymentMethod: ${method}`);
  }
}

/**
 * Convert API PaymentMethod string to API MetodoPago enum
 */
export function mapPaymentMethodFromApi(method: string): MetodoPago {
  switch (method) {
    case "CASH":
      return MetodoPago.CASH;
    case "DEBIT_CARD":
      return MetodoPago.DEBIT_CARD;
    case "CREDIT_CARD":
      return MetodoPago.CREDIT_CARD;
    case "TRANSFER":
      return MetodoPago.TRANSFER;
    default:
      throw new Error(`Unknown PaymentMethod: ${method}`);
  }
}

// ==================== MEMBERSHIP TYPE MAPPING ====================

export function mapMembershipType(type: MembershipType): TipoMembresia {
  switch (type) {
    case "VISIT":
      return TipoMembresia.VISIT;
    case "WEEK":
      return TipoMembresia.WEEK;
    case "MONTH_STUDENT":
      return TipoMembresia.MONTH_STUDENT;
    case "MONTH_GENERAL":
      return TipoMembresia.MONTH_GENERAL;
    case "QUARTER_STUDENT":
      return TipoMembresia.QUARTER_STUDENT;
    case "QUARTER_GENERAL":
      return TipoMembresia.QUARTER_GENERAL;
    case "ANNUAL_STUDENT":
      return TipoMembresia.ANNUAL_STUDENT;
    case "ANNUAL_GENERAL":
      return TipoMembresia.ANNUAL_GENERAL;
    case "PROMOTION":
      return TipoMembresia.PROMOTION;
    case "REBIRTH":
      return TipoMembresia.REBIRTH;
    case "NUTRITION_CONSULTATION":
      return TipoMembresia.NUTRITION_CONSULTATION;
    default:
      throw new Error(`Unknown MembershipType: ${type}`);
  }
}

/**
 * Convert API TipoMembresia to Prisma MembershipType enum
 */
export function mapMembershipTypeToApi(type: MembershipType): TipoMembresia {
  return mapMembershipType(type);
}

/**
 * Convert API TipoMembresia string to Prisma MembershipType enum
 */
export function mapMembershipTypeFromApi(type: string): MembershipType {
  switch (type) {
    case "VISIT":
      return "VISIT";
    case "WEEK":
      return "WEEK";
    case "MONTH_STUDENT":
      return "MONTH_STUDENT";
    case "MONTH_GENERAL":
      return "MONTH_GENERAL";
    case "QUARTER_STUDENT":
      return "QUARTER_STUDENT";
    case "QUARTER_GENERAL":
      return "QUARTER_GENERAL";
    case "ANNUAL_STUDENT":
      return "ANNUAL_STUDENT";
    case "ANNUAL_GENERAL":
      return "ANNUAL_GENERAL";
    case "PROMOTION":
      return "PROMOTION";
    case "REBIRTH":
      return "REBIRTH";
    case "NUTRITION_CONSULTATION":
      return "NUTRITION_CONSULTATION";
    default:
      throw new Error(`Unknown membership type: ${type}`);
  }
}

// ==================== MEMBERSHIP TYPE PARSING ====================

/**
 * Parse and validate membership type string to MembershipType enum
 */
export function parseMembershipType(
  type: string | undefined,
): MembershipType | undefined {
  if (!type) return undefined;

  const normalized = type.toUpperCase();
  const validTypes: MembershipType[] = [
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
  ];

  if (validTypes.includes(normalized as MembershipType)) {
    return normalized as MembershipType;
  }

  throw new Error(`Invalid membership type: ${type}`);
}
