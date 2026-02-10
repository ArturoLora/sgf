// lib/domain/products/validators.ts
/**
 * Products Domain - Validators
 * Pure validation functions
 */

import type { ProductoResponse } from "@/types/api/products";

// ==================== MEMBERSHIP DETECTION ====================

const MEMBERSHIP_KEYWORDS = [
  "EFECTIVO",
  "VISITA",
  "MENSUALIDAD",
  "SEMANA",
] as const;

export function isMembershipProduct(
  product: Pick<ProductoResponse, "name">,
): boolean {
  const nameUpper = product.name.toUpperCase();
  return MEMBERSHIP_KEYWORDS.some((keyword) => nameUpper.includes(keyword));
}

// ==================== STOCK VALIDATIONS ====================

export function validateStockQuantity(
  quantity: number,
  available: number,
): { valid: boolean; error?: string } {
  if (quantity <= 0) {
    return { valid: false, error: "La cantidad debe ser mayor a 0" };
  }

  if (quantity > available) {
    return {
      valid: false,
      error: `Stock insuficiente. Disponible: ${available}`,
    };
  }

  return { valid: true };
}

export function validateMinimumStock(minStock: number): {
  valid: boolean;
  error?: string;
} {
  if (minStock < 0) {
    return {
      valid: false,
      error: "El stock mínimo no puede ser negativo",
    };
  }

  return { valid: true };
}

export function validatePrice(price: number): {
  valid: boolean;
  error?: string;
} {
  if (price <= 0) {
    return { valid: false, error: "El precio debe ser mayor a 0" };
  }

  return { valid: true };
}

// ==================== PRODUCT VALIDATIONS ====================

export function validateProductName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "El nombre es requerido" };
  }

  if (name.trim().length < 2) {
    return {
      valid: false,
      error: "El nombre debe tener al menos 2 caracteres",
    };
  }

  return { valid: true };
}

export function validateProductData(data: {
  name?: string;
  salePrice?: number;
  minStock?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.name !== undefined) {
    const nameValidation = validateProductName(data.name);
    if (!nameValidation.valid && nameValidation.error) {
      errors.push(nameValidation.error);
    }
  }

  if (data.salePrice !== undefined) {
    const priceValidation = validatePrice(data.salePrice);
    if (!priceValidation.valid && priceValidation.error) {
      errors.push(priceValidation.error);
    }
  }

  if (data.minStock !== undefined) {
    const minStockValidation = validateMinimumStock(data.minStock);
    if (!minStockValidation.valid && minStockValidation.error) {
      errors.push(minStockValidation.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== TRANSFER VALIDATIONS ====================

export function validateTransfer(
  quantity: number,
  fromStock: number,
): { valid: boolean; error?: string } {
  if (quantity <= 0) {
    return { valid: false, error: "La cantidad debe ser mayor a 0" };
  }

  if (quantity > fromStock) {
    return {
      valid: false,
      error: `Stock insuficiente en origen. Disponible: ${fromStock}`,
    };
  }

  return { valid: true };
}

// ==================== ADJUSTMENT VALIDATIONS ====================

export function validateAdjustment(
  quantity: number,
  type: "INCREASE" | "DECREASE",
  currentStock: number,
): { valid: boolean; error?: string } {
  if (quantity <= 0) {
    return { valid: false, error: "La cantidad debe ser mayor a 0" };
  }

  if (type === "DECREASE" && quantity > currentStock) {
    return {
      valid: false,
      error: `Stock insuficiente. Disponible: ${currentStock}`,
    };
  }

  return { valid: true };
}

export function validateAdjustmentNotes(notes: string): {
  valid: boolean;
  error?: string;
} {
  if (!notes || notes.trim().length === 0) {
    return {
      valid: false,
      error: "Las notas son requeridas para ajustes",
    };
  }

  return { valid: true };
}
