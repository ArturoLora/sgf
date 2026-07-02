// Pure helper — no Prisma, no I/O. Story 2.2: decides which taxRate to
// assign to each recreated Product when the admin opts to reimport the
// catalog (AC3) — preserves an existing classification by name instead of
// resetting it to 0 (new logic, no equivalent in Epic 1 — see finding G2).

export interface ProductResetPlanEntry {
  name: string;
  taxRate: number;
  preserved: boolean;
}

export function buildProductResetPlan(
  existingTaxRateByName: Map<string, number>,
  productNames: string[],
): ProductResetPlanEntry[] {
  const uniqueNames = [...new Set(productNames)];
  return uniqueNames.map((name) => {
    const existingTaxRate = existingTaxRateByName.get(name);
    return {
      name,
      taxRate: existingTaxRate ?? 0,
      preserved: existingTaxRate !== undefined,
    };
  });
}
