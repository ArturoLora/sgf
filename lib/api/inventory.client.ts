// lib/api/inventory.client.ts

import type {
  CrearVentaRequest,
  CrearEntradaRequest,
  CrearTraspasoRequest,
  CrearAjusteRequest,
  CancelarVentaRequest,
  VentaResponse,
  EntradaResponse,
  TraspasoResponse,
  AjusteResponse,
  MovimientoInventarioResponse,
  KardexMovimientoResponse,
} from "@/types/api/inventory";

const BASE_URL = "/api/inventory";

export async function crearVenta(
  data: CrearVentaRequest,
): Promise<VentaResponse> {
  const res = await fetch(`${BASE_URL}/sale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al crear venta");
  }

  return res.json();
}

export async function crearEntrada(
  data: CrearEntradaRequest,
): Promise<EntradaResponse> {
  const res = await fetch(`${BASE_URL}/entry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al crear entrada");
  }

  return res.json();
}

export async function crearTraspaso(
  data: CrearTraspasoRequest,
): Promise<TraspasoResponse> {
  const res = await fetch(`${BASE_URL}/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al crear traspaso");
  }

  return res.json();
}

export async function crearAjuste(
  data: CrearAjusteRequest,
): Promise<AjusteResponse> {
  const res = await fetch(`${BASE_URL}/adjustment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al crear ajuste");
  }

  return res.json();
}

export async function cancelarVenta(
  data: CancelarVentaRequest,
): Promise<VentaResponse> {
  const res = await fetch(`${BASE_URL}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al cancelar venta");
  }

  return res.json();
}

export async function obtenerMovimientos(
  startDate: string,
  endDate: string,
): Promise<MovimientoInventarioResponse[]> {
  const params = new URLSearchParams({ startDate, endDate });
  const res = await fetch(`${BASE_URL}/movements?${params}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener movimientos");
  }

  return res.json();
}

export async function obtenerVentasCanceladas(
  startDate?: string,
  endDate?: string,
): Promise<VentaResponse[]> {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const res = await fetch(`${BASE_URL}/cancelled?${params}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener ventas canceladas");
  }

  return res.json();
}

export async function obtenerKardex(
  productId: number,
): Promise<KardexMovimientoResponse[]> {
  const res = await fetch(`/api/products/${productId}/kardex`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener kardex");
  }

  return res.json();
}
