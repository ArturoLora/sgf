// lib/domain/shifts/index.ts
// NOTA: shift-operations.ts fue MOVIDO a services/shifts-domain-operations.ts
// porque contiene I/O puro (llama a @/lib/api/shifts.client) — viola pureza del dominio

export * from "./types";
export * from "./shift-calculations";
export * from "./shift-formatters";
