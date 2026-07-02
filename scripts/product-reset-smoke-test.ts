import { buildProductResetPlan } from "../modules/migration/domain/product-reset";

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

console.log("\nbuildProductResetPlan");
{
  const existing = new Map([
    ["MONSTER BLANCO", 0.16],
    ["AGUA CIEL 1.5L", 0],
  ]);
  const plan = buildProductResetPlan(existing, ["MONSTER BLANCO", "AGUA CIEL 1.5L", "VISITA"]);

  assert(plan.length === 3, "one entry per unique product name");

  const monster = plan.find((p) => p.name === "MONSTER BLANCO");
  assert(monster?.taxRate === 0.16, "preserves existing non-zero taxRate");
  assert(monster?.preserved === true, "marks preserved=true when name matched");

  const agua = plan.find((p) => p.name === "AGUA CIEL 1.5L");
  assert(agua?.taxRate === 0, "preserves existing zero taxRate correctly (not confused with 'no match')");
  assert(agua?.preserved === true, "preserved=true even when the preserved value is 0");

  const visita = plan.find((p) => p.name === "VISITA");
  assert(visita?.taxRate === 0, "brand-new product defaults to taxRate 0");
  assert(visita?.preserved === false, "preserved=false for a name with no prior record");
}

{
  const plan = buildProductResetPlan(new Map(), ["AGUA 1L", "AGUA 1L", "AGUA 1L"]);
  assert(plan.length === 1, "duplicate names in input collapse to one entry");
}

{
  const plan = buildProductResetPlan(new Map(), []);
  assert(plan.length === 0, "empty product list produces empty plan");
}

console.log(`\n──────────────────────────────────────────`);
console.log(`product-reset smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
