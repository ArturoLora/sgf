// lib/domain/sales/process.ts
import type { CrearVentaRequest } from "@/types/api/inventory";
import { createSale } from "@/lib/api/sales.client";

/**
 * Procesa una venta completa iterando sobre todos los items
 * Orquesta múltiples llamadas al API para crear cada movimiento de venta
 *
 * @param payloads - Array de payloads de venta (uno por item del carrito)
 * @throws Error si alguna venta falla
 */
export async function processSale(
  payloads: CrearVentaRequest[],
): Promise<void> {
  for (const payload of payloads) {
    await createSale(payload);
  }
}
