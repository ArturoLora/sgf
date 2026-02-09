// lib/domain/sales/payloads.ts
import type { CrearVentaRequest } from "@/types/api/inventory";
import type { MetodoPago } from "@/types/models/movimiento-inventario";
import { CreateSaleInputSchema } from "@/types/api/inventory";

interface ItemCarrito {
  producto: {
    id: number;
    nombre: string;
    precioVenta: number;
    existenciaGym: number;
  };
  cantidad: number;
  precioUnitario: number;
}

interface SaleMetadata {
  clienteId: number | null;
  descuento: number;
  recargo: number;
  metodoPago: MetodoPago;
  ticket: string;
}

/**
 * Construye los payloads de venta a partir del carrito y metadata
 * Distribuye descuentos y recargos proporcionalmente entre items
 */
export function buildSalePayloadFromCart(
  carrito: ItemCarrito[],
  metadata: SaleMetadata,
): CrearVentaRequest[] {
  const { clienteId, descuento, recargo, metodoPago, ticket } = metadata;

  return carrito.map((item) => {
    const payload: CrearVentaRequest = {
      productId: item.producto.id,
      quantity: item.cantidad,
      memberId: clienteId ?? undefined,
      unitPrice: item.precioUnitario,
      discount: descuento / carrito.length,
      surcharge: recargo / carrito.length,
      paymentMethod: metodoPago,
      ticket,
    };

    // Validar solo como guard
    CreateSaleInputSchema.parse(payload);

    return payload;
  });
}
