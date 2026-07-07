// Pure helper — no Prisma, no I/O. Story D2: derives Product.salePrice from
// real sales history after Reconstruction reimports the catalog (resetProducts()
// only preserves {name, taxRate}, salePrice reverts to schema default 0).

export interface SaleMovementForPricing {
  productId: number;
  unitPrice: number | null;
  isCancelled: boolean;
  type: string;
  date: Date;
  id: number;
}

export function computeLastSalePrices(movements: SaleMovementForPricing[]): Map<number, number> {
  const latestByProduct = new Map<number, SaleMovementForPricing>();

  for (const movement of movements) {
    if (movement.type !== "SALE" || movement.isCancelled || movement.unitPrice === null) continue;

    const current = latestByProduct.get(movement.productId);
    if (
      !current ||
      movement.date.getTime() > current.date.getTime() ||
      (movement.date.getTime() === current.date.getTime() && movement.id > current.id)
    ) {
      latestByProduct.set(movement.productId, movement);
    }
  }

  const result = new Map<number, number>();
  for (const [productId, movement] of latestByProduct) {
    result.set(productId, movement.unitPrice as number);
  }
  return result;
}
