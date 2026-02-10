// lib/domain/sales/index.ts

// Calculators (POS)
export { calculateSubtotal, calculateTotal } from "./calculators";

// Payloads (POS)
export { buildSalePayloadFromCart } from "./payloads";

// Process (POS)
export { processSale } from "./process";

// Ticket
export { generateTicket } from "./ticket";

// History filters
export {
  DEFAULT_HISTORY_FILTERS,
  normalizeDateFilter,
  hasActiveFilters,
  buildFiltersWithDateRange,
} from "./history-filters";

// History calculations
export { calculateHistorialStats } from "./history-calculations";
export type { HistorialStats } from "./history-calculations";

// History formatting
export {
  formatDateMX,
  formatPaymentMethod,
  formatCurrency,
} from "./history-formatting";

// History pagination
export {
  isValidPage,
  hasPreviousPage,
  hasNextPage,
  calculateTotalPages,
} from "./history-pagination";
