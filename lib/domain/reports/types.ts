// lib/domain/reports/types.ts
// Tipos internos del dominio de reportes
// SIN dependencias externas

// ==================== REPORTE STOCK ACTUAL (INTERNO) ====================

export interface ProductoStock {
  id: number;
  name: string;
  warehouseStock: number;
  gymStock: number;
  minStock: number;
  salePrice: number;
}

export interface ProductoBajoStock {
  id: number;
  name: string;
  gymStock: number;
  warehouseStock: number;
  minStock: number;
  stockFaltante: {
    gym: number;
    warehouse: number;
  };
}

export interface ResumenStock {
  warehouse: number;
  gym: number;
  total: number;
  totalValue: number;
}

export interface ReporteStockActual {
  products: ProductoStock[];
  stockSummary: ResumenStock;
  lowStock: ProductoBajoStock[];
}
