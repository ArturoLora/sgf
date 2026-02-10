// lib/api/sales.client.ts
import type { ProductoResponse } from "@/types/api/products";
import type { CorteActivoResponse } from "@/types/api/shifts";
import type { CrearVentaRequest, VentaCreada } from "@/types/api/inventory";
import type {
  HistorialVentasResponse,
  DetalleTicketResponse,
  HistorialVentasFilters,
} from "@/types/api/sales";

// ==================== VENTAS (POS) ====================

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

// ==================== HISTORIAL ====================

/**
 * Obtiene el historial de ventas con filtros y paginación
 * 1 función = 1 endpoint: GET /api/sales/history
 */
export async function fetchSalesHistory(
  filters: HistorialVentasFilters,
  page: number,
  perPage: number,
): Promise<HistorialVentasResponse> {
  const params = new URLSearchParams();

  if (filters.search) params.append("search", filters.search);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);
  if (filters.cashier && filters.cashier !== "todos") {
    params.append("cashier", filters.cashier);
  }
  if (filters.product && filters.product !== "todos") {
    params.append("product", filters.product);
  }
  if (filters.member && filters.member !== "todos") {
    params.append("member", filters.member);
  }
  if (filters.paymentMethod && filters.paymentMethod !== "todos") {
    params.append("paymentMethod", filters.paymentMethod);
  }
  if (filters.productType && filters.productType !== "todos") {
    params.append("productType", filters.productType);
  }

  if (filters.orderBy) {
    const separatorIndex = filters.orderBy.lastIndexOf("_");
    const orderByField = filters.orderBy.substring(0, separatorIndex);
    const order = filters.orderBy.substring(separatorIndex + 1);
    params.append("orderBy", orderByField);
    params.append("order", order);
  }

  params.append("onlyActive", (filters.onlyActive ?? true).toString());
  params.append("page", page.toString());
  params.append("perPage", perPage.toString());

  const res = await fetch(`/api/sales/history?${params}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Error al cargar historial de ventas");
  }

  return res.json();
}

/**
 * Obtiene el detalle de un ticket específico
 * 1 función = 1 endpoint: GET /api/sales/history/[ticket]
 */
export async function fetchTicketDetail(
  ticket: string,
): Promise<DetalleTicketResponse> {
  const res = await fetch(`/api/sales/history/${encodeURIComponent(ticket)}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Error al cargar detalle del ticket");
  }

  return res.json();
}
