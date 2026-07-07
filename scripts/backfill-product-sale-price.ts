// Story D1: one-time backfill of Product.salePrice in the CURRENT database.
// D2 (modules/migration/reconstruction.service.ts) already fixes future
// Reconstructions going forward — this script repairs the DB as it stands
// today, using the exact same approved rule, reused (not reimplemented) from
// modules/migration/domain/product-pricing.ts's computeLastSalePrices().
//
// Usage:
//   npx tsx scripts/backfill-product-sale-price.ts            (dry-run, zero writes)
//   npx tsx scripts/backfill-product-sale-price.ts --apply     (writes Product.salePrice)
import "dotenv/config";
import { prisma } from "../lib/db";
import { computeLastSalePrices, type SaleMovementForPricing } from "../modules/migration/domain/product-pricing";

const APPLY = process.argv.includes("--apply");

interface ProductChange {
  productId: number;
  name: string;
  currentSalePrice: number;
  targetSalePrice: number;
  hadValidSale: boolean;
}

async function main() {
  const [products, movements] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true, salePrice: true } }),
    prisma.inventoryMovement.findMany({
      where: { type: "SALE" },
      select: { productId: true, unitPrice: true, isCancelled: true, type: true, date: true, id: true },
    }),
  ]);

  const pricesByProduct = computeLastSalePrices(
    movements.map((m): SaleMovementForPricing => ({
      productId: m.productId,
      unitPrice: m.unitPrice === null ? null : Number(m.unitPrice),
      isCancelled: m.isCancelled,
      type: m.type,
      date: m.date,
      id: m.id,
    })),
  );

  const changes: ProductChange[] = products.map((product) => {
    const hadValidSale = pricesByProduct.has(product.id);
    const targetSalePrice = pricesByProduct.get(product.id) ?? 0;
    return {
      productId: product.id,
      name: product.name,
      currentSalePrice: Number(product.salePrice),
      targetSalePrice,
      hadValidSale,
    };
  });

  const totalProducts = changes.length;
  const withValidSale = changes.filter((c) => c.hadValidSale);
  const withFinalPricePositive = withValidSale.filter((c) => c.targetSalePrice > 0);
  const withHistoryButFinalZero = withValidSale.filter((c) => c.targetSalePrice === 0);
  const withoutSaleHistory = changes.filter((c) => !c.hadValidSale);
  const toUpdate = changes.filter((c) => c.currentSalePrice !== c.targetSalePrice);
  const alreadyMatching = changes.filter((c) => c.currentSalePrice === c.targetSalePrice);

  console.log(`\nBackfill Product.salePrice — modo: ${APPLY ? "APPLY (escribe en DB)" : "DRY-RUN (sin escrituras)"}\n`);
  console.log(`Total Product: ${totalProducts}`);
  console.log(`Productos con SALE válido (type=SALE, !isCancelled, unitPrice!=null): ${withValidSale.length}`);
  console.log(`  con precio final > 0: ${withFinalPricePositive.length}`);
  console.log(`  con historial pero precio final = 0 (último SALE válido tenía unitPrice=0): ${withHistoryButFinalZero.length}`);
  console.log(`Productos sin historial SALE (quedan/permanecen en 0): ${withoutSaleHistory.length}`);
  console.log(`Productos cuyo salePrice cambiaría: ${toUpdate.length}`);
  console.log(`Productos cuyo salePrice ya coincide: ${alreadyMatching.length}`);

  if (toUpdate.length > 0) {
    console.log(`\nMuestra representativa de cambios (hasta 10):`);
    for (const c of toUpdate.slice(0, 10)) {
      console.log(
        `  [${c.productId}] ${c.name}: ${c.currentSalePrice} → ${c.targetSalePrice}` +
          (c.hadValidSale ? "" : " (sin historial SALE válido)"),
      );
    }
  }

  if (!APPLY) {
    console.log(`\nDry-run completo. Cero escrituras en DB. Ejecuta con --apply para aplicar los ${toUpdate.length} cambios.`);
    return;
  }

  console.log(`\nAplicando ${toUpdate.length} cambios...`);
  let updated = 0;
  let failed = 0;
  for (const c of toUpdate) {
    try {
      await prisma.product.update({
        where: { id: c.productId },
        data: { salePrice: c.targetSalePrice },
      });
      updated++;
    } catch (e) {
      failed++;
      console.error(`  ✗ Error actualizando Product ${c.productId} (${c.name}): ${e instanceof Error ? e.message : "Error desconocido"}`);
    }
  }
  console.log(`\nApply completo: ${updated} actualizados, ${failed} fallidos.`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("Error inesperado:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
