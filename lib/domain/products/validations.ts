import type { ProductoResponse } from "@/types/api/products";

export function validateTransferQuantity(
  product: ProductoResponse,
  fromLocation: string,
  quantity: number,
): string | null {
  const available =
    fromLocation === "WAREHOUSE" ? product.warehouseStock : product.gymStock;

  if (quantity <= 0) {
    return "La cantidad debe ser mayor a 0";
  }

  if (quantity > available) {
    return `Stock insuficiente. Disponible: ${available}`;
  }

  return null;
}

export function validateAdjustmentQuantity(
  product: ProductoResponse,
  location: string,
  quantity: number,
  type: "INCREASE" | "DECREASE",
): string | null {
  if (quantity <= 0) {
    return "La cantidad debe ser mayor a 0";
  }

  if (type === "DECREASE") {
    const currentStock =
      location === "WAREHOUSE" ? product.warehouseStock : product.gymStock;
    if (quantity > currentStock) {
      return `Stock insuficiente. Disponible: ${currentStock}`;
    }
  }

  return null;
}

export function validateAdjustmentNotes(
  notes: string | undefined,
): string | null {
  if (!notes || notes.trim() === "") {
    return "Las notas son requeridas para ajustes";
  }
  return null;
}

export function computeAdjustedQuantity(
  quantity: number,
  type: "INCREASE" | "DECREASE",
): number {
  return type === "INCREASE" ? quantity : -quantity;
}

export function oppositeLocation(location: string): string {
  return location === "WAREHOUSE" ? "GYM" : "WAREHOUSE";
}
