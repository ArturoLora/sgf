import type {
  ProductoResponse,
  ProductoConMovimientosResponse,
  CrearProductoRequest,
  ActualizarProductoRequest,
  EstadisticasProductosResponse,
  ProductoBajoStockResponse,
} from "@/types/api/products";

const BASE = "/api/products";

export async function fetchAllProducts(): Promise<ProductoResponse[]> {
  const response = await fetch(BASE);
  return response.json();
}

export async function fetchProductById(
  id: number,
): Promise<ProductoConMovimientosResponse> {
  const response = await fetch(`${BASE}/${id}`);
  return response.json();
}

export async function createProduct(
  data: CrearProductoRequest,
): Promise<ProductoResponse> {
  const response = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateProduct(
  id: number,
  data: ActualizarProductoRequest,
): Promise<ProductoResponse> {
  const response = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function fetchProductsStatistics(): Promise<EstadisticasProductosResponse> {
  const response = await fetch(`${BASE}/statistics`);
  return response.json();
}

export async function fetchLowStockProducts(): Promise<
  ProductoBajoStockResponse[]
> {
  const response = await fetch(`${BASE}/low-stock`);
  return response.json();
}
