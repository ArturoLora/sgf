// lib/domain/shifts/shift-calculations.ts
// Funciones puras de cálculo para cortes de caja
// SIN dependencias externas (no @/types/api, no Prisma)

import type { ValoresArqueo, ResumenCorte, TipoDiferencia } from "./types";

/**
 * Calcula la diferencia entre el arqueo real y el esperado
 */
export function calcularDiferencia(
  resumen: ResumenCorte,
  valores: ValoresArqueo,
): number {
  const totalReal =
    valores.cashAmount +
    valores.debitCardAmount +
    valores.creditCardAmount -
    valores.totalWithdrawals;

  const totalEsperado =
    resumen.initialCash + resumen.totalSales - (resumen.totalWithdrawals || 0);

  return Number((totalReal - totalEsperado).toFixed(2));
}

/**
 * Calcula el efectivo esperado en caja
 */
export function calcularEfectivoEsperado(resumen: ResumenCorte): number {
  return Number(
    (
      resumen.initialCash +
      resumen.cashAmount -
      (resumen.totalWithdrawals || 0)
    ).toFixed(2),
  );
}

/**
 * Verifica si hay una diferencia significativa (> 0.01)
 */
export function tieneDiferenciaSignificativa(diferencia: number): boolean {
  return Math.abs(diferencia) > 0.01;
}

/**
 * Determina el tipo de diferencia
 */
export function tipoDiferencia(diferencia: number): TipoDiferencia {
  if (!tieneDiferenciaSignificativa(diferencia)) {
    return "sin_diferencia";
  }
  return diferencia > 0 ? "sobrante" : "faltante";
}
