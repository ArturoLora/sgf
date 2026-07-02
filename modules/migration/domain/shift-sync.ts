// Pure helpers — no Prisma, no I/O. Map DomainShift/DomainSale/DomainInventoryRow/
// DomainWithdrawal to the plain data shapes migration.service.ts persists via Prisma.
// (Story 1.5)

import type {
  DomainSale,
  DomainInventoryRow,
  DomainWithdrawal,
  MigrationPaymentMethod,
} from "./domain.types";

export interface ShiftUpsertData {
  folio: string;
  cashierId: string;
  openingDate: Date;
  initialCash: number;
  ticketCount: number;
  membershipSales: number;
  productSales0Tax: number;
  productSales16Tax: number;
  subtotal: number;
  tax: number;
  totalSales: number;
  cashAmount: number;
  debitCardAmount: number;
  creditCardAmount: number;
  totalVoucher: number;
  totalWithdrawals: number;
  totalCash: number;
  notes: string | null;
}

export interface ShiftFinancials {
  initialCash: number;
  ticketCount: number;
  membershipSales: number;
  productSales0Tax: number;
  productSales16Tax: number;
  subtotal: number;
  tax: number;
  totalSales: number;
  cashAmount: number;
  debitCardAmount: number;
  creditCardAmount: number;
  totalVoucher: number;
  totalWithdrawalsAmount: number;
  totalCash: number;
}

export function buildShiftUpsertData(
  folio: string,
  cashierId: string,
  openingDate: Date,
  financials: ShiftFinancials,
  notes: string | null,
): ShiftUpsertData {
  return {
    folio,
    cashierId,
    openingDate,
    initialCash: financials.initialCash,
    ticketCount: financials.ticketCount,
    membershipSales: financials.membershipSales,
    productSales0Tax: financials.productSales0Tax,
    productSales16Tax: financials.productSales16Tax,
    subtotal: financials.subtotal,
    tax: financials.tax,
    totalSales: financials.totalSales,
    cashAmount: financials.cashAmount,
    debitCardAmount: financials.debitCardAmount,
    creditCardAmount: financials.creditCardAmount,
    totalVoucher: financials.totalVoucher,
    totalWithdrawals: financials.totalWithdrawalsAmount,
    totalCash: financials.totalCash,
    notes,
  };
}

export interface SaleMovementData {
  type: "SALE";
  location: "GYM";
  quantity: number;
  ticket: string;
  unitPrice: number;
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  paymentMethod: MigrationPaymentMethod | null;
  isCancelled: boolean;
  date: Date;
}

export function buildSaleMovementData(sale: DomainSale, fallbackDate: Date): SaleMovementData {
  const total = sale.price - sale.discount + sale.surcharge;
  return {
    type: "SALE",
    location: "GYM",
    quantity: 1,
    ticket: sale.ticket,
    unitPrice: sale.price,
    subtotal: sale.price,
    discount: sale.discount,
    surcharge: sale.surcharge,
    total,
    paymentMethod: sale.paymentMethod,
    isCancelled: sale.isCancelled,
    date: sale.saleDate ?? fallbackDate,
  };
}

export interface InventoryAdjustmentMovementData {
  type: "ADJUSTMENT" | "GYM_ENTRY";
  location: "GYM";
  quantity: number;
  date: Date;
}

// "Salidas" is deliberately not read — it's a reconciliation total already
// covered by the individual Ventas/Canceladas rows (Story 1.5, H5).
export function buildInventoryAdjustmentMovements(
  row: DomainInventoryRow,
  date: Date,
): InventoryAdjustmentMovementData[] {
  const movements: InventoryAdjustmentMovementData[] = [];
  if (row.adjustment !== 0) {
    movements.push({ type: "ADJUSTMENT", location: "GYM", quantity: row.adjustment, date });
  }
  if (row.entries !== 0) {
    movements.push({ type: "GYM_ENTRY", location: "GYM", quantity: row.entries, date });
  }
  return movements;
}

export interface CashWithdrawalData {
  amount: number;
  concept: string;
  createdAt: Date;
}

// Returns null for zero/negative amounts — not every Retiros row is a real withdrawal.
export function buildWithdrawalData(
  withdrawal: DomainWithdrawal,
  fallbackDate: Date,
): CashWithdrawalData | null {
  if (withdrawal.amount <= 0) return null;
  return {
    amount: withdrawal.amount,
    concept: withdrawal.concept,
    createdAt: withdrawal.withdrawalDate ?? fallbackDate,
  };
}
