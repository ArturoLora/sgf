// lib/api/sales.client.ts
import type { ProductoResponse } from "@/types/api/products";
import type { CorteActivoResponse } from "@/types/api/shifts";
import type { CrearVentaRequest } from "@/types/api/inventory";
import type { VentaCreada } from "@/types/api/inventory";

/**
 * Verifica si hay un corte activo
 */
export async function fetchActiveShift(): Promise<CorteActivoResponse | null> {
  const res = await fetch("/api/shifts/active", {
    credentials: "include",
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

/**
 * Obtiene productos activos disponibles para venta
 */
export async function fetchSaleProducts(params?: {
  isActive?: boolean;
}): Promise<ProductoResponse[]> {
  const searchParams = new URLSearchParams();

  if (params?.isActive !== undefined) {
    searchParams.set("isActive", String(params.isActive));
  }

  const res = await fetch(`/api/products?${searchParams.toString()}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Error al cargar productos");
  }

  return res.json();
}

/**
 * Crea una única venta
 * Contrato: 1 request = 1 movimiento de venta
 */
export async function createSale(
  payload: CrearVentaRequest,
): Promise<VentaCreada> {
  const res = await fetch("/api/inventory/sale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al procesar venta");
  }

  return res.json();
}
