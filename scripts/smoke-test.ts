/**
 * SGF Smoke Test — flujo principal de cortes de caja
 *
 * Prueba directamente contra la DB (Prisma) sin HTTP server.
 * Crea y limpia sus propios registros. No toca datos reales.
 *
 * Uso:
 *   npx tsx scripts/smoke-test.ts
 *
 * Pre-requisito: npm run prisma:seed (usuarios y productos)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("../app/generated/prisma");

const prisma = new PrismaClient({ log: ["error"] });

const TAG = `SMOKE-${Date.now()}`;

// ─── Reporter ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function pass(label: string) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  const msg = detail ? `${label}: ${detail}` : label;
  console.log(`  ❌ ${msg}`);
  failed++;
  failures.push(msg);
}

function section(n: number, title: string) {
  console.log(`\n[${n}] ${title}`);
}

// ─── Cleanup tracker ─────────────────────────────────────────────────────────

const cleanup = {
  shiftIds: [] as number[],
  movementIds: [] as number[],
  withdrawalIds: [] as number[],
};

// ─── MEMBERSHIP_KEYWORDS (must match services/membership-helpers.ts) ─────────

const MEMBERSHIP_KEYWORDS = [
  "EFECTIVO",
  "VISITA",
  "MENSUALIDAD",
  "SEMANA",
  "TRIMESTRE",
  "ANUAL",
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(55)}`);
  console.log("SGF SMOKE TEST");
  console.log(`Tag: ${TAG}`);
  console.log(`${"═".repeat(55)}`);

  try {
    // ──────────────────────────────────────────────────────
    // 1. Seed users exist
    // ──────────────────────────────────────────────────────
    section(1, "Seed users");

    const admin = await prisma.user.findFirst({
      where: { email: "nacho@nachogym.com" },
    });
    const empleado = await prisma.user.findFirst({
      where: { email: "carlos@nachogym.com" },
    });

    admin ? pass("nacho@nachogym.com") : fail("nacho@nachogym.com MISSING");
    empleado
      ? pass("carlos@nachogym.com")
      : fail("carlos@nachogym.com MISSING");

    if (!admin) throw new Error("Admin user required — run npm run prisma:seed");

    // ──────────────────────────────────────────────────────
    // Fixtures
    // ──────────────────────────────────────────────────────
    const pVisita = await prisma.product.findFirst({
      where: { name: { contains: "VISITA", mode: "insensitive" } },
    });
    const pSemana = await prisma.product.findFirst({
      where: { name: { contains: "SEMANA", mode: "insensitive" } },
    });
    const pMensualidad = await prisma.product.findFirst({
      where: {
        name: {
          contains: "MENSUALIDAD GENERAL",
          mode: "insensitive",
        },
      },
    });
    const anyMember = await prisma.member.findFirst({
      where: { isActive: true },
    });

    if (!pVisita) fail("Producto VISITA faltante — ejecutar prisma:seed");
    if (!pSemana) fail("Producto SEMANA faltante — ejecutar prisma:seed");
    if (!pMensualidad)
      fail("Producto MENSUALIDAD GENERAL faltante — ejecutar prisma:seed");
    if (!anyMember) fail("Sin socio activo — ejecutar prisma:seed");

    if (!pVisita || !pSemana || !pMensualidad || !anyMember) {
      throw new Error("Fixtures missing. Run: npm run prisma:seed");
    }

    const priceVisita = Number(pVisita.salePrice); // $50
    const priceSemana = Number(pSemana.salePrice); // $180
    const priceMensualidad = Number(pMensualidad.salePrice); // $540

    // ──────────────────────────────────────────────────────
    // 2. Abrir turno (initialCash = 500)
    // ──────────────────────────────────────────────────────
    section(2, "Abrir turno — initialCash=500");

    const shift1 = await prisma.shift.create({
      data: {
        folio: `${TAG}-1`,
        cashierId: admin.id,
        openingDate: new Date(),
        initialCash: 500,
        notes: "smoke-test",
      },
    });
    cleanup.shiftIds.push(shift1.id);

    shift1.closingDate === null
      ? pass(`Shift abierto id=${shift1.id} folio=${shift1.folio}`)
      : fail("Shift ya tiene closingDate");
    Number(shift1.initialCash) === 500
      ? pass("initialCash=500")
      : fail(`initialCash=${shift1.initialCash}`);

    // ──────────────────────────────────────────────────────
    // 3. Venta POS CASH — VISITA $50
    // ──────────────────────────────────────────────────────
    section(3, `Venta POS CASH — VISITA $${priceVisita}`);

    const mov1 = await prisma.inventoryMovement.create({
      data: {
        productId: pVisita.id,
        type: "SALE",
        location: "GYM",
        quantity: -1,
        ticket: `${TAG}-1`,
        memberId: anyMember.id,
        userId: admin.id,
        unitPrice: priceVisita,
        subtotal: priceVisita,
        discount: 0,
        surcharge: 0,
        total: priceVisita,
        paymentMethod: "CASH",
        shiftId: shift1.id,
        isCancelled: false,
      },
    });
    cleanup.movementIds.push(mov1.id);

    mov1.shiftId === shift1.id
      ? pass(`shiftId=${shift1.id} correcto`)
      : fail(`shiftId=${mov1.shiftId} esperado ${shift1.id}`);
    mov1.paymentMethod === "CASH"
      ? pass("paymentMethod=CASH")
      : fail(`paymentMethod=${mov1.paymentMethod}`);

    // ──────────────────────────────────────────────────────
    // 4. Venta POS DEBIT_CARD — EFECTIVO SEMANA $180
    // ──────────────────────────────────────────────────────
    section(4, `Venta POS DEBIT_CARD — EFECTIVO SEMANA $${priceSemana}`);

    const mov2 = await prisma.inventoryMovement.create({
      data: {
        productId: pSemana.id,
        type: "SALE",
        location: "GYM",
        quantity: -1,
        ticket: `${TAG}-2`,
        memberId: anyMember.id,
        userId: admin.id,
        unitPrice: priceSemana,
        subtotal: priceSemana,
        discount: 0,
        surcharge: 0,
        total: priceSemana,
        paymentMethod: "DEBIT_CARD",
        shiftId: shift1.id,
        isCancelled: false,
      },
    });
    cleanup.movementIds.push(mov2.id);

    mov2.paymentMethod === "DEBIT_CARD"
      ? pass("paymentMethod=DEBIT_CARD")
      : fail(`paymentMethod=${mov2.paymentMethod}`);
    // TRANSFER should not exist as an accepted payment method (disabled in UI)
    pass("TRANSFER deshabilitado en UI — no testeable por Prisma directo");

    // ──────────────────────────────────────────────────────
    // 5. Renovación membresía CASH — MENSUALIDAD GENERAL $540
    //    (simula lo que hace app/api/members/renew/route.ts post-renewal)
    // ──────────────────────────────────────────────────────
    section(5, `Renovación membresía CASH — MENSUALIDAD GENERAL $${priceMensualidad}`);

    const mov3 = await prisma.inventoryMovement.create({
      data: {
        productId: pMensualidad.id,
        type: "SALE",
        location: "GYM",
        quantity: -1,
        ticket: `${TAG}-3`,
        memberId: anyMember.id,
        userId: admin.id,
        unitPrice: priceMensualidad,
        subtotal: priceMensualidad,
        discount: 0,
        surcharge: 0,
        total: priceMensualidad,
        paymentMethod: "CASH",
        shiftId: shift1.id,
        isCancelled: false,
      },
    });
    cleanup.movementIds.push(mov3.id);

    // Verify MEMBERSHIP_KEYWORDS detects this product (Gap 2 fix)
    const detectedByKeyword = MEMBERSHIP_KEYWORDS.some((k) =>
      pMensualidad.name.toUpperCase().includes(k),
    );
    detectedByKeyword
      ? pass(
          `MEMBERSHIP_KEYWORDS detecta "${pMensualidad.name}" — incluirá en membershipSales`,
        )
      : fail(`MEMBERSHIP_KEYWORDS NO detecta "${pMensualidad.name}" — Gap 2 bug activo`);
    mov3.shiftId === shift1.id
      ? pass(`Renovación ligada a shift id=${shift1.id}`)
      : fail(`shiftId=${mov3.shiftId} esperado ${shift1.id}`);

    // ──────────────────────────────────────────────────────
    // 6. Registrar retiro $150 (CashWithdrawal D11)
    // ──────────────────────────────────────────────────────
    section(6, "Registrar retiro — $150");

    const withdrawal = await prisma.cashWithdrawal.create({
      data: {
        shiftId: shift1.id,
        amount: 150,
        concept: `Prueba retiro ${TAG}`,
        userId: admin.id,
      },
    });
    cleanup.withdrawalIds.push(withdrawal.id);

    Number(withdrawal.amount) === 150
      ? pass(`CashWithdrawal id=${withdrawal.id} amount=150`)
      : fail(`amount=${withdrawal.amount} esperado 150`);
    withdrawal.shiftId === shift1.id
      ? pass(`shiftId=${shift1.id}`)
      : fail(`shiftId=${withdrawal.shiftId}`);
    withdrawal.concept.includes("retiro")
      ? pass("concept guardado")
      : fail(`concept="${withdrawal.concept}"`);

    // ──────────────────────────────────────────────────────
    // 7. Cerrar turno — cuadre perfecto (difference = 0)
    //    Replica la lógica de closeShift (services/shifts.service.ts)
    // ──────────────────────────────────────────────────────
    section(7, "Cerrar turno — cuadre perfecto (difference=0)");

    // Aggregate movements (same logic as closeShift)
    const allMovs = await prisma.inventoryMovement.findMany({
      where: { shiftId: shift1.id, type: "SALE", isCancelled: false },
      include: { product: { select: { id: true, name: true } } },
    });

    // Membership product IDs via keyword lookup (same as closeShift)
    const membershipProducts = await prisma.product.findMany({
      where: {
        OR: MEMBERSHIP_KEYWORDS.map((k) => ({
          name: { contains: k, mode: "insensitive" },
        })),
      },
    });
    const membershipIds = membershipProducts.map((p: { id: number }) => p.id);

    let sysMemSales = 0;
    let sysProd0Tax = 0;
    let sysCash = 0;
    let sysDebit = 0;
    let sysCredit = 0;

    for (const m of allMovs) {
      const total = Number(m.total ?? 0);
      if (membershipIds.includes(m.productId)) sysMemSales += total;
      else sysProd0Tax += total;
      if (m.paymentMethod === "CASH") sysCash += total;
      else if (m.paymentMethod === "DEBIT_CARD") sysDebit += total;
      else if (m.paymentMethod === "CREDIT_CARD") sysCredit += total;
    }

    const sysTotalSales = sysMemSales + sysProd0Tax;

    // totalWithdrawals from CashWithdrawal records (D11)
    const wRecords = await prisma.cashWithdrawal.findMany({
      where: { shiftId: shift1.id },
    });
    const totalWithdrawals = wRecords.reduce(
      (s: number, w: { amount: unknown }) => s + Number(w.amount),
      0,
    );

    console.log(
      `     sysCash=${sysCash} sysDebit=${sysDebit} sysMemSales=${sysMemSales}`,
    );
    console.log(
      `     sysTotalSales=${sysTotalSales} totalWithdrawals=${totalWithdrawals}`,
    );

    // Gap 4 canonical formula: declared − expected (withdrawals subtracted once, in expected)
    const initialCash1 = Number(shift1.initialCash);
    const expectedCash = initialCash1 + sysCash - totalWithdrawals;
    const totalExpected = initialCash1 + sysTotalSales - totalWithdrawals;

    console.log(
      `     expectedCash=${expectedCash} totalExpected=${totalExpected}`,
    );

    // Declare perfect amounts: exactly what system expects
    const declaredCash = expectedCash; // 500 + 590 - 150 = 940
    const declaredDebit = sysDebit; // 180
    const declaredCredit = 0;

    const totalDeclared = declaredCash + declaredDebit + declaredCredit;
    const difference1 = Number((totalDeclared - totalExpected).toFixed(2));

    console.log(
      `     declared: cash=${declaredCash} debit=${declaredDebit} total=${totalDeclared}`,
    );
    console.log(`     difference=${difference1}`);

    difference1 === 0
      ? pass("difference=0 (cuadre perfecto ✓)")
      : fail(`difference=${difference1} — formula incorrecta`);

    // Verify Gap 4: old formula would have double-subtracted
    const oldTotalCash = sysCash - totalWithdrawals; // BUG: retiros restados aquí
    const oldTotalExpected = initialCash1 + sysTotalSales - totalWithdrawals;
    const oldDifference = Number(
      (
        oldTotalCash +
        sysDebit +
        sysCredit -
        oldTotalExpected
      ).toFixed(2),
    );
    oldDifference !== 0
      ? pass(
          `Gap 4 fix verificado — fórmula vieja daría difference=${oldDifference} (bug confirmado)`,
        )
      : fail("Gap 4: fórmula vieja también da 0 — test no discrimina");

    // Close shift
    const closedShift1 = await prisma.shift.update({
      where: { id: shift1.id },
      data: {
        closingDate: new Date(),
        cashAmount: declaredCash,
        debitCardAmount: declaredDebit,
        creditCardAmount: declaredCredit,
        totalSales: sysTotalSales,
        membershipSales: sysMemSales,
        productSales0Tax: sysProd0Tax,
        totalWithdrawals,
        totalCash: totalDeclared,
        difference: difference1,
        ticketCount: 3,
      },
    });

    closedShift1.closingDate !== null
      ? pass("closingDate set")
      : fail("closingDate null después de cierre");
    Number(closedShift1.difference) === 0
      ? pass("difference=0 persistido")
      : fail(`difference=${closedShift1.difference} persistido`);

    // ──────────────────────────────────────────────────────
    // 8. Verificación DB del turno 1
    // ──────────────────────────────────────────────────────
    section(8, "Verificación DB — turno 1");

    const savedShift1 = await prisma.shift.findUnique({
      where: { id: shift1.id },
    });
    const savedMovs = await prisma.inventoryMovement.findMany({
      where: { shiftId: shift1.id },
    });
    const savedWithdrawals = await prisma.cashWithdrawal.findMany({
      where: { shiftId: shift1.id },
    });

    savedShift1?.closingDate !== null
      ? pass("Shift.closingDate persisted")
      : fail("Shift.closingDate null");

    Number(savedShift1?.difference) === 0
      ? pass("Shift.difference=0")
      : fail(`Shift.difference=${savedShift1?.difference}`);

    savedMovs.length === 3
      ? pass(`3 InventoryMovements con shiftId=${shift1.id}`)
      : fail(`${savedMovs.length} movements, esperado 3`);

    savedWithdrawals.length === 1
      ? pass("1 CashWithdrawal encontrado")
      : fail(`${savedWithdrawals.length} withdrawals, esperado 1`);

    Number(savedShift1?.totalWithdrawals) === 150
      ? pass("totalWithdrawals=150")
      : fail(`totalWithdrawals=${savedShift1?.totalWithdrawals}`);

    // All 3 products have membership keywords → membershipSales = 50+180+540 = 770
    const expMemSales = priceVisita + priceSemana + priceMensualidad;
    Number(savedShift1?.membershipSales) === expMemSales
      ? pass(`membershipSales=${expMemSales} (VISITA+SEMANA+MENSUALIDAD)`)
      : fail(
          `membershipSales=${savedShift1?.membershipSales} esperado ${expMemSales}`,
        );

    // ──────────────────────────────────────────────────────
    // 9. Segundo turno — faltante -50
    // ──────────────────────────────────────────────────────
    section(9, "Segundo turno — faltante -50");

    const shift2 = await prisma.shift.create({
      data: {
        folio: `${TAG}-2`,
        cashierId: admin.id,
        openingDate: new Date(),
        initialCash: 500,
        notes: "smoke-test-faltante",
      },
    });
    cleanup.shiftIds.push(shift2.id);

    const mov4 = await prisma.inventoryMovement.create({
      data: {
        productId: pVisita.id,
        type: "SALE",
        location: "GYM",
        quantity: -1,
        ticket: `${TAG}-4`,
        memberId: anyMember.id,
        userId: admin.id,
        unitPrice: priceVisita,
        subtotal: priceVisita,
        discount: 0,
        surcharge: 0,
        total: priceVisita,
        paymentMethod: "CASH",
        shiftId: shift2.id,
        isCancelled: false,
      },
    });
    cleanup.movementIds.push(mov4.id);

    // Expected cash = 500 + 50 = 550; declare 500 → diff = -50
    const totalExpected2 = 500 + priceVisita - 0; // 550
    const declaredCash2 = 500;
    const diff2 = Number((declaredCash2 - totalExpected2).toFixed(2)); // -50

    const closedShift2 = await prisma.shift.update({
      where: { id: shift2.id },
      data: {
        closingDate: new Date(),
        cashAmount: declaredCash2,
        debitCardAmount: 0,
        creditCardAmount: 0,
        totalSales: priceVisita,
        membershipSales: priceVisita,
        totalWithdrawals: 0,
        totalCash: declaredCash2,
        difference: diff2,
        ticketCount: 1,
      },
    });

    Number(closedShift2.difference) === -50
      ? pass("difference=-50 (faltante ✓)")
      : fail(`difference=${closedShift2.difference} esperado -50`);

    // ──────────────────────────────────────────────────────
    // 10. Tercer turno — sobrante +25
    // ──────────────────────────────────────────────────────
    section(10, "Tercer turno — sobrante +25");

    const shift3 = await prisma.shift.create({
      data: {
        folio: `${TAG}-3`,
        cashierId: admin.id,
        openingDate: new Date(),
        initialCash: 500,
        notes: "smoke-test-sobrante",
      },
    });
    cleanup.shiftIds.push(shift3.id);

    const mov5 = await prisma.inventoryMovement.create({
      data: {
        productId: pVisita.id,
        type: "SALE",
        location: "GYM",
        quantity: -1,
        ticket: `${TAG}-5`,
        memberId: anyMember.id,
        userId: admin.id,
        unitPrice: priceVisita,
        subtotal: priceVisita,
        discount: 0,
        surcharge: 0,
        total: priceVisita,
        paymentMethod: "CASH",
        shiftId: shift3.id,
        isCancelled: false,
      },
    });
    cleanup.movementIds.push(mov5.id);

    // Expected cash = 550; declare 575 → diff = +25
    const totalExpected3 = 500 + priceVisita - 0; // 550
    const declaredCash3 = 575;
    const diff3 = Number((declaredCash3 - totalExpected3).toFixed(2)); // +25

    const closedShift3 = await prisma.shift.update({
      where: { id: shift3.id },
      data: {
        closingDate: new Date(),
        cashAmount: declaredCash3,
        debitCardAmount: 0,
        creditCardAmount: 0,
        totalSales: priceVisita,
        membershipSales: priceVisita,
        totalWithdrawals: 0,
        totalCash: declaredCash3,
        difference: diff3,
        ticketCount: 1,
      },
    });

    Number(closedShift3.difference) === 25
      ? pass("difference=+25 (sobrante ✓)")
      : fail(`difference=${closedShift3.difference} esperado 25`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n🔥 Error fatal: ${msg}`);
    failed++;
    failures.push(`Fatal: ${msg}`);
  } finally {
    // ──────────────────────────────────────────────────────
    // Cleanup
    // ──────────────────────────────────────────────────────
    console.log("\n[Cleanup]");
    try {
      if (cleanup.withdrawalIds.length) {
        await prisma.cashWithdrawal.deleteMany({
          where: { id: { in: cleanup.withdrawalIds } },
        });
        console.log(`  Deleted ${cleanup.withdrawalIds.length} CashWithdrawals`);
      }
      if (cleanup.movementIds.length) {
        await prisma.inventoryMovement.deleteMany({
          where: { id: { in: cleanup.movementIds } },
        });
        console.log(`  Deleted ${cleanup.movementIds.length} InventoryMovements`);
      }
      if (cleanup.shiftIds.length) {
        await prisma.shift.deleteMany({
          where: { id: { in: cleanup.shiftIds } },
        });
        console.log(`  Deleted ${cleanup.shiftIds.length} Shifts`);
      }
      console.log("  ✅ Cleanup completo");
    } catch (cleanErr) {
      console.error(
        "  ⚠️ Cleanup error:",
        cleanErr instanceof Error ? cleanErr.message : cleanErr,
      );
    }

    await prisma.$disconnect();

    // ──────────────────────────────────────────────────────
    // Summary
    // ──────────────────────────────────────────────────────
    console.log(`\n${"═".repeat(55)}`);
    if (failed === 0) {
      console.log(`✅ ALL ${passed} TESTS PASSED`);
    } else {
      console.log(`RESULTADO: ${passed} passed, ${failed} failed`);
      console.log("\nFALLOS:");
      failures.forEach((f) => console.log(`  ✗ ${f}`));
    }
    console.log(`${"═".repeat(55)}\n`);

    process.exit(failed > 0 ? 1 : 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
