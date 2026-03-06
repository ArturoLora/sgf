// lib/domain/shared/types.ts
// Re-exporta tipos compartidos del dominio desde la fuente de verdad.
// Los módulos de dominio (lib/domain/*) deben importar MetodoPago desde aquí
// en lugar de desde @/types/models directamente, para mantener la independencia
// de la capa de dominio respecto a la capa de modelos de API.

// lib/domain/shared/types.ts
// Tipos internos compartidos entre módulos del dominio
// SIN dependencias externas (no @/types/api, no Prisma)

// ==================== UBICACIONES ====================

export type Ubicacion = "GYM" | "WAREHOUSE";

// ==================== MÉTODOS DE PAGO ====================

// Re-exportado desde la fuente de verdad del dominio.
// Usar el enum garantiza type-safety en formularios, payloads y handlers
// sin necesidad de casts manuales salvo en callbacks de shadcn/ui Select.
export { MetodoPago } from "@/types/models/movimiento-inventario";

// ==================== TIPOS DE INVENTARIO ====================

export type TipoInventarioKardex = "SALE" | "ENTRY" | "TRANSFER" | "ADJUSTMENT";

// ==================== ESTADOS DE STOCK ====================

export type EstadoStock = {
  variant: "destructive" | "outline" | "default";
  texto: string;
  className?: string;
};

// ==================== PAGINACIÓN ====================

export interface PaginacionInfo {
  paginaActual: number;
  totalPaginas: number;
  inicio: number;
  fin: number;
  total: number;
}

export interface PaginacionResult<T> {
  items: T[];
  totalPaginas: number;
}
