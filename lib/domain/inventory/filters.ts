// lib/domain/inventory/filters.ts
// Filtros puros del dominio de inventario
// SIN dependencias externas

import type { Producto } from "../products/types";

export type UbicacionFiltro = "todos" | "gym" | "bodega";
export type EstadoFiltro = "todos" | "stock_ok" | "bajo_stock" | "sin_stock";
export type OrdenarPor =
  | "nombre"
  | "stockGym"
  | "stockBodega"
  | "stockTotal"
  | "valor";
export type Orden = "asc" | "desc";

export interface FiltrosInventario {
  busqueda: string;
  ubicacion: UbicacionFiltro;
  estado: EstadoFiltro;
  ordenarPor: OrdenarPor;
  orden: Orden;
}

export function filtrarPorBusqueda(
  productos: Producto[],
  busqueda: string,
): Producto[] {
  if (!busqueda) return productos;

  const termino = busqueda.toLowerCase();
  return productos.filter((p) => p.name.toLowerCase().includes(termino));
}

export function filtrarPorEstado(
  productos: Producto[],
  estado: EstadoFiltro,
): Producto[] {
  if (estado === "todos") return productos;

  return productos.filter((p) => {
    const stockTotal = p.warehouseStock + p.gymStock;

    switch (estado) {
      case "bajo_stock":
        return p.gymStock < p.minStock || p.warehouseStock < p.minStock;
      case "sin_stock":
        return stockTotal === 0;
      case "stock_ok":
        return (
          p.gymStock >= p.minStock &&
          p.warehouseStock >= p.minStock &&
          stockTotal > 0
        );
      default:
        return true;
    }
  });
}

export function ordenarProductos(
  productos: Producto[],
  ordenarPor: OrdenarPor,
  orden: Orden,
): Producto[] {
  const copia = [...productos];

  copia.sort((a, b) => {
    let valorA: number | string;
    let valorB: number | string;

    switch (ordenarPor) {
      case "stockGym":
        valorA = a.gymStock;
        valorB = b.gymStock;
        break;
      case "stockBodega":
        valorA = a.warehouseStock;
        valorB = b.warehouseStock;
        break;
      case "stockTotal":
        valorA = a.warehouseStock + a.gymStock;
        valorB = b.warehouseStock + b.gymStock;
        break;
      case "valor":
        valorA = Number(a.salePrice) * (a.warehouseStock + a.gymStock);
        valorB = Number(b.salePrice) * (b.warehouseStock + b.gymStock);
        break;
      default:
        valorA = a.name;
        valorB = b.name;
    }

    if (valorA < valorB) return orden === "asc" ? -1 : 1;
    if (valorA > valorB) return orden === "asc" ? 1 : -1;
    return 0;
  });

  return copia;
}

export function aplicarFiltros(
  productos: Producto[],
  filtros: FiltrosInventario,
): Producto[] {
  let resultado = productos;

  resultado = filtrarPorBusqueda(resultado, filtros.busqueda);
  resultado = filtrarPorEstado(resultado, filtros.estado);
  resultado = ordenarProductos(resultado, filtros.ordenarPor, filtros.orden);

  return resultado;
}
