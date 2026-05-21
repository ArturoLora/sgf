// lib/domain/shifts/shift-calculations.ts
// Funciones puras de cálculo para cortes de caja
// SIN dependencias externas (no @/types/api, no Prisma)

import type { ValoresArqueo, ResumenCorte, TipoDiferencia } from "./types";

/**
 * Calcula la diferencia entre el arqueo real y el esperado.
 *
 * Fórmula canónica:
 *   totalDeclared = cashAmount + debitCardAmount + creditCardAmount
 *   totalEsperado = initialCash + totalSales - totalWithdrawals
 *   diferencia    = totalDeclared - totalEsperado
 *
 * IMPORTANTE: cashAmount es efectivo NETO (retiros ya descontados físicamente).
 * Los retiros NO se vuelven a restar de totalDeclared; solo se descuentan
 * una vez en totalEsperado.
 */
export function calcularDiferencia(
  resumen: ResumenCorte,
  valores: ValoresArqueo,
): number {
  const totalDeclared =
    valores.cashAmount +
    valores.debitCardAmount +
    valores.creditCardAmount;

  const totalEsperado =
    resumen.initialCash + resumen.totalSales - (resumen.totalWithdrawals || 0);

  return Number((totalDeclared - totalEsperado).toFixed(2));
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
