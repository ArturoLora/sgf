// lib/domain/shared/pagination.ts
// Utilidades puras de paginación compartidas entre módulos del dominio
// SIN dependencias externas

export interface ResultadoPaginacion<T> {
  items: T[];
  totalPaginas: number;
  inicio: number;
  fin: number;
  total: number;
}

/**
 * Pagina un array de items
 */
export function paginar<T>(
  items: T[],
  pagina: number,
  itemsPorPagina: number,
): ResultadoPaginacion<T> {
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / itemsPorPagina));
  const paginaSegura = Math.max(1, Math.min(pagina, totalPaginas));
  const inicio = (paginaSegura - 1) * itemsPorPagina;
  const fin = Math.min(inicio + itemsPorPagina, total);

  return {
    items: items.slice(inicio, fin),
    totalPaginas,
    inicio,
    fin,
    total,
  };
}

/**
 * Calcula el número total de páginas
 */
export function calcularTotalPaginas(
  totalItems: number,
  itemsPorPagina: number,
): number {
  return Math.max(1, Math.ceil(totalItems / itemsPorPagina));
}

/**
 * Calcula los números de página visibles en el paginador
 */
export function calcularPaginasVisibles(
  paginaActual: number,
  totalPaginas: number,
  maxVisibles: number = 5,
): number[] {
  if (totalPaginas <= maxVisibles) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  const mitad = Math.floor(maxVisibles / 2);

  if (paginaActual <= mitad + 1) {
    return Array.from({ length: maxVisibles }, (_, i) => i + 1);
  }

  if (paginaActual >= totalPaginas - mitad) {
    return Array.from(
      { length: maxVisibles },
      (_, i) => totalPaginas - maxVisibles + 1 + i,
    );
  }

  return Array.from(
    { length: maxVisibles },
    (_, i) => paginaActual - mitad + i,
  );
}

/**
 * Verifica si una página es válida
 */
export function esPaginaValida(pagina: number, totalPaginas: number): boolean {
  return pagina >= 1 && pagina <= totalPaginas;
}

/**
 * ¿Hay página anterior?
 */
export function hayPaginaAnterior(paginaActual: number): boolean {
  return paginaActual > 1;
}

/**
 * ¿Hay página siguiente?
 */
export function hayPaginaSiguiente(
  paginaActual: number,
  totalPaginas: number,
): boolean {
  return paginaActual < totalPaginas;
}
