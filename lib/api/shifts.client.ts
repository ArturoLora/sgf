// lib/api/shifts.client.ts

import type {
  CorteResponse,
  CorteActivoConVentasResponse,
  CorteConVentasResponse,
  ResumenCorteResponse,
  ListaCortesResponse,
  OpenShiftInput,
  CloseShiftInput,
  BuscarCortesQuery,
} from "@/types/api/shifts";

/**
 * API Client para operaciones de cortes (shifts)
 * Responsabilidad: solo fetch, sin lógica de negocio
 */

export async function fetchAbrirCorte(
  data: OpenShiftInput,
): Promise<CorteResponse> {
  const res = await fetch("/api/shifts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al abrir corte");
  }

  return res.json();
}

export async function fetchCerrarCorte(
  data: CloseShiftInput,
): Promise<CorteResponse> {
  const res = await fetch("/api/shifts/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al cerrar corte");
  }

  return res.json();
}

export async function fetchCortes(
  params?: BuscarCortesQuery,
): Promise<ListaCortesResponse> {
  const searchParams = new URLSearchParams();

  if (params?.search) searchParams.append("search", params.search);
  if (params?.startDate) searchParams.append("startDate", params.startDate);
  if (params?.endDate) searchParams.append("endDate", params.endDate);
  if (params?.cashier) searchParams.append("cashier", params.cashier);
  if (params?.status) searchParams.append("status", params.status);
  if (params?.orderBy) searchParams.append("orderBy", params.orderBy);
  if (params?.order) searchParams.append("order", params.order);
  if (params?.page) searchParams.append("page", params.page);
  if (params?.perPage) searchParams.append("perPage", params.perPage);

  const res = await fetch(`/api/shifts?${searchParams}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener cortes");
  }

  return res.json();
}

export async function fetchCorteActivo(): Promise<CorteActivoConVentasResponse | null> {
  const res = await fetch("/api/shifts/active");

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener corte activo");
  }

  return res.json();
}

export async function fetchCorteById(
  id: number,
): Promise<CorteConVentasResponse> {
  const res = await fetch(`/api/shifts/${id}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener corte");
  }

  return res.json();
}

export async function fetchResumenCorte(
  id: number,
): Promise<ResumenCorteResponse> {
  const res = await fetch(`/api/shifts/${id}/summary`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener resumen");
  }

  return res.json();
}

// ==================== NAMED OPERATIONS (used by React components) ====================

/**
 * Abre un nuevo corte de caja.
 */
export async function abrirCorte(
  data: OpenShiftInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    await fetchAbrirCorte(data);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al abrir corte",
    };
  }
}

/**
 * Cierra el corte de caja activo.
 */
export async function cerrarCorte(
  data: CloseShiftInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    await fetchCerrarCorte(data);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al cerrar corte",
    };
  }
}

/**
 * Carga la lista paginada de cortes con filtros opcionales.
 */
export async function cargarCortes(
  params?: BuscarCortesQuery,
): Promise<{ success: boolean; data?: ListaCortesResponse; error?: string }> {
  try {
    const data = await fetchCortes(params);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al cargar cortes",
    };
  }
}

/**
 * Verifica si existe un corte activo en el sistema.
 */
export async function verificarCorteActivo(): Promise<{
  success: boolean;
  corte?: CorteActivoConVentasResponse;
  error?: string;
}> {
  try {
    const corte = await fetchCorteActivo();
    return { success: true, corte: corte ?? undefined };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Error al verificar corte activo",
    };
  }
}

/**
 * Carga el resumen de un corte para el modal de cierre.
 */
export async function cargarResumenCorte(
  corteId: number,
): Promise<{
  success: boolean;
  resumen?: ResumenCorteResponse;
  error?: string;
}> {
  try {
    const resumen = await fetchResumenCorte(corteId);
    return { success: true, resumen };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Error al cargar resumen del corte",
    };
  }
}

/**
 * Carga el detalle completo de un corte para el modal de detalle.
 */
export async function cargarDetalleCorte(
  corteId: number,
): Promise<{
  success: boolean;
  corte?: CorteConVentasResponse;
  error?: string;
}> {
  try {
    const corte = await fetchCorteById(corteId);
    return { success: true, corte };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Error al cargar detalle del corte",
    };
  }
}
