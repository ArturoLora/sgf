// lib/domain/inventory/pagination.ts

export interface PaginacionInfo {
  paginaActual: number;
  totalPaginas: number;
  inicio: number;
  fin: number;
  total: number;
}

export function calcularPaginacion(
  totalItems: number,
  paginaActual: number,
  itemsPorPagina: number,
): PaginacionInfo {
  const totalPaginas = Math.ceil(totalItems / itemsPorPagina);
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

export function obtenerPaginasVisibles(
  paginaActual: number,
  totalPaginas: number,
  maxPaginas: number = 5,
): number[] {
  if (totalPaginas <= maxPaginas) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  if (paginaActual <= 3) {
    return Array.from({ length: maxPaginas }, (_, i) => i + 1);
  }

  if (paginaActual >= totalPaginas - 2) {
    return Array.from(
      { length: maxPaginas },
      (_, i) => totalPaginas - maxPaginas + i + 1,
    );
  }

  return Array.from({ length: maxPaginas }, (_, i) => paginaActual - 2 + i);
}

export function paginar<T>(
  items: T[],
  paginaActual: number,
  itemsPorPagina: number,
): T[] {
  const inicio = (paginaActual - 1) * itemsPorPagina;
  return items.slice(inicio, inicio + itemsPorPagina);
}
