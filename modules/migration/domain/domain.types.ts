// Pure domain types — no Prisma, exceljs, or HTTP imports.
// All parser/transformer results conform to these interfaces.

// ─── Enum-compatible string literal types ─────────────────────────────────────
// Values match Prisma MembershipType / PaymentMethod exactly — safe to cast in service layer.

export type MigrationMembershipType =
  | "VISIT"
  | "WEEK"
  | "MONTH_STUDENT"
  | "MONTH_GENERAL"
  | "QUARTER_STUDENT"
  | "QUARTER_GENERAL"
  | "ANNUAL_STUDENT"
  | "ANNUAL_GENERAL"
  | "PROMOTION"
  | "REBIRTH"
  | "NUTRITION_CONSULTATION";

export type MigrationPaymentMethod = "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "TRANSFER";

// ─── Observable parser result types ───────────────────────────────────────────
// Every parser returns a rich result so callers can build warnings without re-parsing.

export interface ParseWarningDetail {
  code: string;
  message: string;
}

export interface MembershipParseResult {
  membershipType: MigrationMembershipType | null;
  paymentPrefix: MigrationPaymentMethod | null;
  trainerName: string | null;
  month: number | null;  // 1–12
  year: number | null;
  rawInput: string;
  recognized: boolean;
  warning: ParseWarningDetail | null;
}

export interface FormaPagoParseResult {
  paymentMethod: MigrationPaymentMethod | null;
  sellerName: string | null;
  rawInput: string;
  recognized: boolean;
  warning: ParseWarningDetail | null;
}

export type DateFormat =
  | "date-object"
  | "spanish-datetime"
  | "spanish-date"
  | "excel-serial"
  | "excel-time"
  | "iso-string"
  | "empty"
  | "unknown";

export interface DateParseResult {
  date: Date | null;
  rawInput: string;
  format: DateFormat;
  recognized: boolean;
  warning: ParseWarningDetail | null;
}

// ─── Transformation warnings ───────────────────────────────────────────────────

export interface ParseWarning {
  filename: string;
  row?: number;
  field: string;
  originalValue: string;
  message: string;
  code?: string;
}

export interface ParseResult<T> {
  data: T;
  warnings: ParseWarning[];
}

// ─── Domain entities ───────────────────────────────────────────────────────────

export interface DomainMember {
  memberNumber: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  membershipType: MigrationMembershipType | null;
  membershipDescription: string | null;         // raw original string — for audit
  paymentMethodFromMembership: MigrationPaymentMethod | null;
  totalVisits: number;
  lastVisit: Date | null;
  isActive: boolean;
}

export interface DomainSale {
  ticket: string;
  saleDate: Date | null;
  memberNumber: string | null;
  memberName: string | null;
  description: string;
  paymentMethod: MigrationPaymentMethod | null;
  sellerName: string | null;
  price: number;
  discount: number;
  surcharge: number;
  isCancelled: boolean;
  isMembership: boolean;
}

export interface DomainInventoryRow {
  productName: string;
  gymStock: number;       // = existenciaActual from xlsx
  warehouseStock: number; // always 0 during import
}

export interface DomainWithdrawal {
  withdrawalDate: Date | null;
  concept: string;
  amount: number;
}

export interface DomainShift {
  folio: string;
  openingDate: Date | null;
  openingTime: string | null;  // "HH:mm"
  closingTime: string | null;  // "HH:mm"
  sales: DomainSale[];
  inventory: DomainInventoryRow[];
  withdrawals: DomainWithdrawal[];
  legacyNotes: string | null;
}

// ─── Preview aggregation ───────────────────────────────────────────────────────

export interface PreviewFilesResult {
  members: DomainMember[];
  shifts: DomainShift[];
  warnings: ParseWarning[];
  membershipTypeDistribution: Partial<Record<string, number>>;
}
