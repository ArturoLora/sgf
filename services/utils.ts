import { Decimal } from "@prisma/client/runtime/library";
import { MembershipType } from "@prisma/client";

export function serializeDecimal(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => {
      if (val instanceof Decimal) {
        return Number(val.toString());
      }
      if (val instanceof Date) {
        return val.toISOString();
      }
      return val;
    }),
  );
}

/**
 * Parse ISO date string to Date object
 */
export function parseISODate(dateString: string | undefined): Date | undefined {
  if (!dateString) return undefined;
  return new Date(dateString);
}

/**
 * Parse boolean from query string
 */
export function parseBooleanQuery(
  value: string | undefined,
): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Parse and validate integer parameter (e.g., from URL params)
 */
export function parseIntParam(value: string, paramName: string = "ID"): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`${paramName} inválido`);
  }
  return parsed;
}

/**
 * Calculate end date based on membership type
 */
function calculateEndDate(
  startDate: Date,
  membershipType: MembershipType,
): Date {
  const date = new Date(startDate);

  switch (membershipType) {
    case "VISIT":
      return date;
    case "WEEK":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTH_STUDENT":
    case "MONTH_GENERAL":
      date.setMonth(date.getMonth() + 1);
      break;
    case "QUARTER_STUDENT":
    case "QUARTER_GENERAL":
      date.setMonth(date.getMonth() + 3);
      break;
    case "ANNUAL_STUDENT":
    case "ANNUAL_GENERAL":
      date.setFullYear(date.getFullYear() + 1);
      break;
    case "PROMOTION":
    case "REBIRTH":
    case "NUTRITION_CONSULTATION":
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return date;
}

/**
 * Calculate membership start and end dates
 */
export function calculateMembershipDates(
  membershipType: MembershipType,
  startDate?: Date,
): { startDate: Date; endDate: Date } {
  const start = startDate || new Date();
  const end = calculateEndDate(start, membershipType);

  return {
    startDate: start,
    endDate: end,
  };
}
