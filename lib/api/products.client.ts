/**
 * Products API Client
 * Pure fetch calls - NO business logic
 */

import type {
  ProductoResponse,
  ProductoConMovimientosResponse,
  CrearProductoRequest,
  ActualizarProductoRequest,
  BuscarProductosQuery,
} from "@/types/api/products";

const BASE_URL = "/api/products";

// ==================== GET ====================

export async function fetchProducts(
  query?: BuscarProductosQuery,
): Promise<ProductoResponse[]> {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.isActive) params.set("isActive", query.isActive);
  if (query?.lowStock) params.set("lowStock", query.lowStock);

  const url = params.toString() ? `${BASE_URL}?${params}` : BASE_URL;
  const response = await fetch(url);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Error al cargar productos");
  }

  return response.json();
}

export async function fetchProductById(
  id: number,
): Promise<ProductoConMovimientosResponse> {
  const response = await fetch(`${BASE_URL}/${id}`);

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Producto no encontrado");
  }

  return response.json();
}

// ==================== POST ====================

export async function createProduct(
  data: CrearProductoRequest,
): Promise<ProductoResponse> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Error al crear producto");
  }

  return result;
}

// ==================== PATCH ====================

export async function updateProduct(
  id: number,
  data: ActualizarProductoRequest,
): Promise<ProductoResponse> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Error al actualizar producto");
  }

  return result;
}

// ==================== DELETE ====================

export async function toggleProductStatus(
  id: number,
): Promise<ProductoResponse> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Error al cambiar estado");
  }

  return result;
}
