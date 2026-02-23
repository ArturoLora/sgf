// lib/domain/inventory/formatters.ts
// Formatters puros del dominio de inventario
// SIN dependencias externas

import type { Producto } from "./calculations";

export type EstadoStock = {
  variant: "destructive" | "outline" | "default";
  texto: string;
  className?: string;
};

export function formatearEstadoStock(
  actual: number,
  minimo: number,
): EstadoStock {
  if (actual === 0) {
    return {
      variant: "destructive",
      texto: "Sin stock",
    };
  }

  if (actual < minimo) {
    return {
      variant: "outline",
      texto: "Bajo",
      className:
        "bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    };
  }

  return {
    variant: "default",
    texto: "OK",
    className:
      "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  };
}

export function formatearPrecio(precio: number): string {
  return `$${Number(precio).toFixed(2)}`;
}

export function formatearValor(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

export function formatearCantidad(cantidad: number): string {
  return cantidad.toString();
}

const KEYWORDS_MEMBRESIA = [
  "EFECTIVO",
  "VISITA",
  "MENSUALIDAD",
  "SEMANA",
  "TRIMESTRE",
  "ANUAL",
  "PROMOCION",
  "RENACER",
];

export function esProductoFisico(nombreProducto: string): boolean {
  return !KEYWORDS_MEMBRESIA.some((keyword) =>
    nombreProducto.toUpperCase().includes(keyword),
  );
}

export function filtrarProductosFisicos(productos: Producto[]): Producto[] {
  return productos.filter((p) => esProductoFisico(p.name));
}
