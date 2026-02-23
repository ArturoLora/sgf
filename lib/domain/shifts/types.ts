// lib/domain/shifts/types.ts
// Tipos internos del dominio de cortes
// SIN dependencias externas (no @/types/api, no Prisma)

// ==================== ESTADO DE CORTE ====================

export type EstadoCorte = "OPEN" | "CLOSED";

// ==================== VALORES DE ARQUEO ====================

export interface ValoresArqueo {
  cashAmount: number;
  debitCardAmount: number;
  creditCardAmount: number;
  totalWithdrawals: number;
}

// ==================== RESUMEN DE CORTE (INTERNO) ====================

export interface ResumenCorte {
  initialCash: number;
  ticketCount: number;
  totalSales: number;
  cashAmount: number;
  debitCardAmount: number;
  creditCardAmount: number;
  totalWithdrawals: number;
}

// ==================== TIPO DE DIFERENCIA ====================

export type TipoDiferencia = "sobrante" | "faltante" | "sin_diferencia";
