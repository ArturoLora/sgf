import { z } from "zod";

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

export interface ReporteStockActual {
  products: Array<{
    id: number;
    name: string;
    warehouseStock: number;
    gymStock: number;
    minStock: number;
    salePrice: number;
  }>;
  stockSummary: {
    warehouse: number;
    gym: number;
    total: number;
    totalValue: number;
  };
  lowStock: Array<{
    id: number;
    name: string;
    warehouseStock: number;
    gymStock: number;
    minStock: number;
  }>;
}

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
