// Story A1: getShifts() debe exponer closedCount/openCount reales sobre
// baseWhere (todos los filtros excepto status), independientes de la
// paginación y sin volverse triviales cuando se filtra por status.
//
// A diferencia de los demás smoke tests del proyecto, este SÍ toca la DB
// (solo lectura — getShifts() nunca escribe). No hay forma de probar la
// construcción real de baseWhere/where sin Prisma: la lógica vive inline en
// el service, no en una función pura de dominio.
import { getShifts } from "../services/shifts.service";
import { prisma } from "../lib/db";

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

async function main() {
  console.log("\ngetShifts() — estadísticas agregadas reales (Story A1)");

  // Sin filtros: closedCount + openCount debe cubrir el universo completo.
  const sinFiltros = await getShifts({ page: 1, perPage: 10 });
  assert(
    sinFiltros.closedCount + sinFiltros.openCount === sinFiltros.total,
    "sin filtros: closedCount + openCount === total (AC-1)",
  );

  // Paginación: cambiar de página no debe alterar closedCount/openCount.
  const pagina2 = await getShifts({ page: 2, perPage: 10 });
  assert(
    pagina2.closedCount === sinFiltros.closedCount && pagina2.openCount === sinFiltros.openCount,
    "cambiar de página no altera closedCount/openCount (AC-2)",
  );
  assert(pagina2.total === sinFiltros.total, "total tampoco cambia entre páginas");

  // Filtro de fecha: total/closedCount/openCount deben coincidir con un
  // count() independiente sobre el mismo rango (cross-check, no hardcode).
  const startDate = new Date("2026-01-01T00:00:00.000Z");
  const endDate = new Date("2026-01-31T23:59:59.999Z");
  const porFecha = await getShifts({ startDate, endDate, page: 1, perPage: 10 });
  const [expTotalFecha, expClosedFecha, expOpenFecha] = await Promise.all([
    prisma.shift.count({ where: { openingDate: { gte: startDate, lte: endDate } } }),
    prisma.shift.count({ where: { openingDate: { gte: startDate, lte: endDate }, closingDate: { not: null } } }),
    prisma.shift.count({ where: { openingDate: { gte: startDate, lte: endDate }, closingDate: null } }),
  ]);
  assert(porFecha.total === expTotalFecha, "filtro de fecha: total coincide con count() independiente (AC-3)");
  assert(
    porFecha.closedCount === expClosedFecha && porFecha.openCount === expOpenFecha,
    "filtro de fecha: closedCount/openCount coinciden con count() independiente (AC-3)",
  );

  // Filtro de cajero: mismo cross-check, usando el cajero con más turnos.
  const topCajero = await prisma.shift.groupBy({
    by: ["cashierId"],
    _count: true,
    orderBy: { _count: { cashierId: "desc" } },
    take: 1,
  });
  if (topCajero[0]) {
    const cashierId = topCajero[0].cashierId;
    const porCajero = await getShifts({ cashier: cashierId, page: 1, perPage: 10 });
    const [expTotalCajero, expClosedCajero, expOpenCajero] = await Promise.all([
      prisma.shift.count({ where: { cashierId } }),
      prisma.shift.count({ where: { cashierId, closingDate: { not: null } } }),
      prisma.shift.count({ where: { cashierId, closingDate: null } }),
    ]);
    assert(porCajero.total === expTotalCajero, "filtro de cajero: total coincide con count() independiente (AC-4)");
    assert(
      porCajero.closedCount === expClosedCajero && porCajero.openCount === expOpenCajero,
      "filtro de cajero: closedCount/openCount coinciden con count() independiente (AC-4)",
    );
  } else {
    console.log("  (sin turnos en DB — se omiten los casos de filtro de cajero)");
  }

  // Filtro de status: `total` refleja el filtro, pero closedCount/openCount
  // NO deben trivializarse — deben seguir mostrando la distribución completa
  // de baseWhere (AC-5), idéntica a la de "sin filtros".
  const soloAbiertos = await getShifts({ status: "abiertos", page: 1, perPage: 10 });
  const soloCerrados = await getShifts({ status: "cerrados", page: 1, perPage: 10 });
  assert(
    soloAbiertos.closedCount === sinFiltros.closedCount && soloAbiertos.openCount === sinFiltros.openCount,
    "status=abiertos no trivializa closedCount/openCount — igual a la distribución sin filtros (AC-5)",
  );
  assert(
    soloCerrados.closedCount === sinFiltros.closedCount && soloCerrados.openCount === sinFiltros.openCount,
    "status=cerrados no trivializa closedCount/openCount — igual a la distribución sin filtros (AC-5)",
  );

  console.log(`\n──────────────────────────────────────────`);
  console.log(`shifts-aggregate-stats smoke: ${passed} passed, ${failed} failed`);
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
