"use client";

export interface ShiftCheckState {
  hasActiveShift: boolean | null;
  loadingShift: boolean;
}

/**
 * Pure derived hook — no I/O.
 * Extracts shift-related flags from state owned by the Manager/Container.
 * All fetching is orchestrated by VentasContainer.
 */
export function useShiftCheck(state: ShiftCheckState): {
  hasActiveShift: boolean | null;
  loadingShift: boolean;
  isShiftReady: boolean;
  canSell: boolean;
} {
  const { hasActiveShift, loadingShift } = state;

  return {
    hasActiveShift,
    loadingShift,
    isShiftReady: !loadingShift && hasActiveShift !== null,
    canSell: hasActiveShift === true,
  };
}
