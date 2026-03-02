import { z } from "zod";

// FASE 9B [ALTA-3]: ReporteStockActual estaba duplicado entre
// types/api/reports.ts y lib/domain/reports/types.ts.
// Fuente de verdad semántica: lib/domain/reports/types.ts.
// Este módulo re-exporta el tipo del dominio; el DTO de API es idéntico
// en estructura → no hay justificación para redefinirlo.
//
// NOTA: ProductoBajoStockResponse se importa desde types/api/products.ts
// (que a su vez es alias de lib/domain/reports/types.ts#ProductoBajoStock).
// Esto elimina la dependencia circular que existía previamente.

import type { ReporteStockActual as _ReporteStockActualDomain } from "../../lib/domain/reports/types";
import type { ProductoBajoStockResponse } from "./products";

// ==================== ZOD SCHEMAS ====================

export const ReportPeriodQuerySchema = z.object({
  startDate: z.string().min(1, "startDate is required"),
  endDate: z.string().min(1, "endDate is required"),
});

export const DashboardQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ==================== INFERRED TYPES ====================

export type ReportPeriodQueryInput = z.infer<typeof ReportPeriodQuerySchema>;
export type DashboardQueryInput = z.infer<typeof DashboardQuerySchema>;

// ==================== REQUEST/QUERY TYPES ====================

export interface PeriodoReporteQuery {
  startDate: string;
  endDate: string;
}

// ==================== RESPONSE TYPES ====================

export interface ReporteVentasPorProducto {
  productId: number;
  productName: string;
  quantitySold: number;
  totalSales: number;
  quantityCancelled: number;
  totalCancelled: number;
}

export interface ReporteVentasDiarias {
  date: string;
  ticketCount: number;
  totalSales: number;
  totalCancelled: number;
}

export interface ReporteFormaPago {
  paymentMethod: string;
  quantity: number;
  total: number;
}

export interface ReporteVentasCanceladas {
  sales: Array<{
    id: number;
    ticket?: string;
    date: Date;
    total: number;
    cancellationReason?: string;
    cancellationDate?: Date;
    product: {
      name: string;
    };
    member?: {
      memberNumber: string;
      name?: string;
    };
    user: {
      name: string;
    };
  }>;
  totalCancelled: number;
  cancellationCount: number;
}

export interface ReporteMovimientosInventario {
  movements: Array<{
    id: number;
    type: string;
    location: string;
    quantity: number;
    date: Date;
    product: {
      name: string;
    };
    user: {
      name: string;
    };
  }>;
  summaryByType: Array<{
    type: string;
    quantity: number;
  }>;
}

// FASE 9B [ALTA-3]: ReporteStockActual — alias del tipo canónico del dominio.
// La estructura del dominio (ProductoStock, ResumenStock, ProductoBajoStock)
// es idéntica a lo que este DTO exponía. El campo `lowStock` usa
// ProductoBajoStockResponse (alias de ProductoBajoStock) para coherencia de API.
//
// Si en el futuro el dominio y la API divergen, reemplazar el alias
// por una interfaz propia que extienda o adapte _ReporteStockActualDomain.
export type ReporteStockActual = _ReporteStockActualDomain;

export interface ReporteSociosPorMembresia {
  membershipType: string;
  isActive: boolean;
  quantity: number;
}

export interface ReporteSociosNuevos {
  members: Array<{
    id: number;
    memberNumber: string;
    name?: string;
    membershipType?: string;
    createdAt: Date;
  }>;
  byDay: Array<{
    date: string;
    quantity: number;
  }>;
  total: number;
}

export interface ReporteVisitasSocios {
  member: {
    memberNumber: string;
    name?: string;
    membershipType?: string;
  };
  visitCount: number;
}

export interface ResumenDashboard {
  salesToday: {
    total: number;
    tickets: number;
    quantity: number;
  };
  members: {
    active: number;
  };
  products: {
    active: number;
    lowStock: number;
  };
  activeShift?: {
    id: number;
    folio: string;
    cashier: {
      name: string;
    };
    openingDate: Date;
    initialCash: number;
  };
}
