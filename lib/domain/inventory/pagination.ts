// lib/domain/inventory/pagination.ts
// Paginación pura para inventario
// Delega a shared/pagination como única fuente de verdad

export {
  paginar,
  calcularTotalPaginas,
  calcularPaginasVisibles as obtenerPaginasVisibles,
  esPaginaValida,
  hayPaginaAnterior,
  hayPaginaSiguiente,
} from "../shared/pagination";

export type { ResultadoPaginacion as PaginacionInfo } from "../shared/pagination";

// Adaptador: calcularPaginacion → interfaz compatible con consumers existentes
import {
  paginar as paginarBase,
  calcularTotalPaginas,
} from "../shared/pagination";

export function calcularPaginacion(
  totalItems: number,
  paginaActual: number,
  itemsPorPagina: number,
): {
  paginaActual: number;
  totalPaginas: number;
  inicio: number;
  fin: number;
  total: number;
} {
  const totalPaginas = calcularTotalPaginas(totalItems, itemsPorPagina);
  const inicio = (paginaActual - 1) * itemsPorPagina;
  const fin = Math.min(inicio + itemsPorPagina, totalItems);

  return {
    paginaActual,
    totalPaginas,
    inicio,
    fin,
    total: totalItems,
  };
}
