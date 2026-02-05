import { getSaleProducts as getProductsForSale } from "./products.service";
import type { ProductoVentaResponse } from "@/types/api/sales";

/**
 * Sales service - wraps product service for sales-specific operations
 */

export async function getSaleProducts(): Promise<ProductoVentaResponse[]> {
  return getProductsForSale();
}
