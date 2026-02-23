// lib/domain/sales/payloads.ts
// Constructores puros de payloads de venta
// SIN dependencias externas (no @/types/api, no Prisma)

import type { ItemCarrito, CrearVentaPayload, SaleMetadata } from "./types";

/**
 * Construye los payloads de venta a partir del carrito y metadata.
 * Distribuye descuentos y recargos proporcionalmente entre items.
 */
export function buildSalePayloadFromCart(
  carrito: ItemCarrito[],
  metadata: SaleMetadata,
): CrearVentaPayload[] {
  const { clienteId, descuento, recargo, metodoPago, ticket } = metadata;

  return carrito.map((item) => {
    const payload: CrearVentaPayload = {
      productId: item.producto.id,
      quantity: item.cantidad,
      memberId: clienteId ?? undefined,
      unitPrice: item.precioUnitario,
      discount: descuento / carrito.length,
      surcharge: recargo / carrito.length,
      paymentMethod: metodoPago,
      ticket,
    };

    return payload;
  });
}
