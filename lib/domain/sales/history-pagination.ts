// lib/domain/sales/history-pagination.ts
// Paginación del historial de ventas
// FASE 7C: delegada completamente a shared/pagination
// shared es la única fuente de verdad

export {
  esPaginaValida as isValidPage,
  hayPaginaAnterior as hasPreviousPage,
  hayPaginaSiguiente as hasNextPage,
  calcularTotalPaginas as calculateTotalPages,
} from "../shared/pagination";
