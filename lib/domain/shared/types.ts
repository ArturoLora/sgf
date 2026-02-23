// lib/domain/shared/types.ts
// Tipos internos compartidos entre módulos del dominio
// SIN dependencias externas (no @/types/api, no Prisma)

// ==================== UBICACIONES ====================

export type Ubicacion = "GYM" | "WAREHOUSE";

// ==================== MÉTODOS DE PAGO ====================

export type MetodoPago = "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "TRANSFER";

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
