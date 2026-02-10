// lib/domain/shifts/shift-calculations.ts

import type { ResumenCorteResponse } from "@/types/api/shifts";

/**
 * Domain Layer - Cálculos de Cortes
 * Responsabilidad: Funciones puras de cálculo
 */

export interface ValoresArqueo {
  cashAmount: number;
  debitCardAmount: number;
  creditCardAmount: number;
  totalWithdrawals: number;
}

/**
 * Calcula la diferencia entre el arqueo real y el esperado
 */
export function calcularDiferencia(
  resumen: ResumenCorteResponse,
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
export function calcularEfectivoEsperado(
  resumen: ResumenCorteResponse,
): number {
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
export function tipoDiferencia(
  diferencia: number,
): "sobrante" | "faltante" | "sin_diferencia" {
  if (!tieneDiferenciaSignificativa(diferencia)) {
    return "sin_diferencia";
  }
  return diferencia > 0 ? "sobrante" : "faltante";
}
