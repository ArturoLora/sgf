// lib/domain/shifts/shift-operations.ts

import {
  fetchAbrirCorte,
  fetchCerrarCorte,
  fetchCortes,
  fetchCorteActivo,
  fetchCorteById,
  fetchResumenCorte,
} from "@/lib/api/shifts.client";
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
 * Domain Layer - Operaciones de Cortes
 * Responsabilidad: Orquestación de flujos de negocio
 */

export interface AbrirCorteResult {
  success: boolean;
  corte?: CorteResponse;
  error?: string;
}

export interface CerrarCorteResult {
  success: boolean;
  corte?: CorteResponse;
  error?: string;
}

export interface CargarCortesResult {
  success: boolean;
  data?: ListaCortesResponse;
  error?: string;
}

export interface VerificarCorteActivoResult {
  success: boolean;
  corte?: CorteActivoConVentasResponse | null;
  error?: string;
}

export interface CargarDetalleCorteResult {
  success: boolean;
  corte?: CorteConVentasResponse;
  error?: string;
}

export interface CargarResumenCorteResult {
  success: boolean;
  resumen?: ResumenCorteResponse;
  error?: string;
}

/**
 * Abre un nuevo corte de caja
 */
export async function abrirCorte(
  data: OpenShiftInput,
): Promise<AbrirCorteResult> {
  try {
    const corte = await fetchAbrirCorte(data);
    return {
      success: true,
      corte,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Cierra el corte de caja actual
 */
export async function cerrarCorte(
  data: CloseShiftInput,
): Promise<CerrarCorteResult> {
  try {
    const corte = await fetchCerrarCorte(data);
    return {
      success: true,
      corte,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Carga la lista de cortes con filtros y paginación
 */
export async function cargarCortes(
  params?: BuscarCortesQuery,
): Promise<CargarCortesResult> {
  try {
    const data = await fetchCortes(params);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar cortes",
    };
  }
}

/**
 * Verifica si existe un corte activo
 */
export async function verificarCorteActivo(): Promise<VerificarCorteActivoResult> {
  try {
    const corte = await fetchCorteActivo();
    return {
      success: true,
      corte,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al verificar corte activo",
    };
  }
}

/**
 * Carga el detalle completo de un corte
 */
export async function cargarDetalleCorte(
  id: number,
): Promise<CargarDetalleCorteResult> {
  try {
    const corte = await fetchCorteById(id);
    return {
      success: true,
      corte,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar detalle",
    };
  }
}

/**
 * Carga el resumen de un corte para el arqueo
 */
export async function cargarResumenCorte(
  id: number,
): Promise<CargarResumenCorteResult> {
  try {
    const resumen = await fetchResumenCorte(id);
    return {
      success: true,
      resumen,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cargar resumen",
    };
  }
}
