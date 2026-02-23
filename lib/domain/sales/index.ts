// lib/domain/sales/index.ts
// NOTA: process.ts fue MOVIDO a services/sales.process.ts
// porque contiene I/O (llama a API client) — viola pureza del dominio

export * from "./types";
export * from "./calculators";
export * from "./payloads";
export * from "./ticket";
export * from "./history-filters";
export * from "./history-calculations";
export * from "./history-formatting";
export * from "./history-pagination";
