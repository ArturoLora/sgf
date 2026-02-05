import { MembershipType } from "@prisma/client";

// ==================== MEMBERSHIP KEYWORDS ====================

export const MEMBERSHIP_KEYWORDS = [
  "EFECTIVO",
  "VISITA",
  "MENSUALIDAD",
  "SEMANA",
  "TRIMESTRE",
  "ANUAL",
] as const;

// ==================== MEMBERSHIP DETECTION ====================

/**
 * Checks if a product name represents a membership product
 */
export function isMembershipProduct(productName: string): boolean {
  const upperName = productName.toUpperCase();
  return MEMBERSHIP_KEYWORDS.some((keyword) => upperName.includes(keyword));
}

// ==================== MEMBERSHIP TYPE TO KEYWORD MAPPING ====================

const MEMBERSHIP_TYPE_TO_KEYWORD: Record<MembershipType, string> = {
  VISIT: "VISITA",
  WEEK: "SEMANA",
  MONTH_STUDENT: "MENSUALIDAD ESTUDIANTE",
  MONTH_GENERAL: "MENSUALIDAD GENERAL",
  QUARTER_STUDENT: "TRIMESTRE ESTUDIANTE",
  QUARTER_GENERAL: "TRIMESTRE GENERAL",
  ANNUAL_STUDENT: "ANUAL ESTUDIANTE",
  ANNUAL_GENERAL: "ANUAL GENERAL",
  PROMOTION: "PROMOCION",
  REBIRTH: "RENACER",
  NUTRITION_CONSULTATION: "NUTRICION",
};

/**
 * Gets the product keyword for a membership type
 */
export function getMembershipProductKeyword(
  membershipType: MembershipType,
): string {
  return MEMBERSHIP_TYPE_TO_KEYWORD[membershipType];
}

/**
 * Gets the product keyword for an API membership type string
 */
export function getMembershipProductKeywordFromApi(
  membershipType: string,
): string {
  const keyword = MEMBERSHIP_TYPE_TO_KEYWORD[membershipType as MembershipType];
  if (!keyword) {
    throw new Error(`Unknown membership type: ${membershipType}`);
  }
  return keyword;
}
