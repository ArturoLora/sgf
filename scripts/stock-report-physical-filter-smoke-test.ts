// Story C1: demuestra que las métricas de stock de Reportes solo deben
// agregar productos físicos — usando la MISMA regla compartida que
// /inventario (filtrarProductosFisicos), sin reimplementarla ni hardcodear
// "VISITA". Sin DB — fixtures en memoria.
import { filtrarProductosFisicos } from "../modules/inventory/domain/formatters";
import type { Producto } from "../types/models/producto";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function buildProduct(overrides: Partial<Producto>): Producto {
  return {
    id: 0,
    name: "PRODUCTO",
    salePrice: 0,
    warehouseStock: 0,
    gymStock: 0,
    minStock: 0,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

console.log("\nfiltrarProductosFisicos — métricas de stock (Story C1)");
{
  // Pseudo-producto con stock centinela alto — mismo patrón real que VISITA
  // (gymStock=9999), pero el nombre por sí solo no está hardcodeado en el fix.
  const sentinela = buildProduct({ id: 1, name: "VISITA", gymStock: 9999, warehouseStock: 0, salePrice: 0 });
  // Pseudo-producto de membresía distinto de VISITA — prueba que la regla es
  // genérica (basada en keywords), no un caso especial de un solo nombre.
  const membresia = buildProduct({
    id: 2,
    name: "TARJETA MENSUALIDAD GENERAL ENE 2026",
    gymStock: 500,
    warehouseStock: 0,
    salePrice: 600,
  });
  // Producto físico real — debe sobrevivir al filtro.
  const fisico = buildProduct({ id: 3, name: "MONSTER BLANCO", gymStock: 12, warehouseStock: 8, salePrice: 45 });

  const result = filtrarProductosFisicos([sentinela, membresia, fisico]);

  assert(result.length === 1, "solo el producto físico sobrevive al filtro");
  assert(result[0]?.id === 3, "el producto físico sobreviviente es el correcto");
  assert(!result.some((p) => p.id === sentinela.id), "el pseudo-producto centinela (VISITA) no entra en el resultado");
  assert(
    !result.some((p) => p.id === membresia.id),
    "un pseudo-producto de membresía distinto de VISITA también se excluye (regla genérica por keyword, no hardcode)",
  );

  // Misma agregación que getCurrentStockReport()/getDashboardSummary() —
  // filtrar ANTES de sumar evita que el stock centinela contamine el total.
  const totalGymStock = result.reduce((sum, p) => sum + p.gymStock, 0);
  assert(totalGymStock === 12, "stock centinela (9999) excluido del total agregado de gym");

  const totalStock = result.reduce((sum, p) => sum + p.gymStock + p.warehouseStock, 0);
  assert(totalStock === 20, "total físico = solo el producto físico (12+8), sin centinela ni membresías");
}

console.log(`\n──────────────────────────────────────────`);
console.log(`stock-report-physical-filter smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
