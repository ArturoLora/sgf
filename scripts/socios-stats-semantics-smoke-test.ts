// Story B1: dos ejes de negocio independientes (isActive vs vigencia por
// endDate) — calcularEstadisticas() no debe mezclarlos, y las cards de
// /socios deben ignorar estado/vigencia reutilizando filtrarSocios() con
// esos dos ejes neutralizados a "todos". Sin DB — fixtures en memoria.
import { calcularEstadisticas } from "../modules/members/domain/calculations";
import { filtrarSocios } from "../modules/members/domain/filters";
import { FILTROS_INICIALES, TipoMembresia } from "../modules/members/types";
import type { Socio, SociosFiltros } from "../modules/members/types";

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

const AYER = new Date();
AYER.setDate(AYER.getDate() - 1);
const MANANA = new Date();
MANANA.setDate(MANANA.getDate() + 1);

function buildSocio(overrides: Partial<Socio>): Socio {
  return {
    id: 0,
    memberNumber: "M0",
    totalVisits: 0,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

console.log("\ncalcularEstadisticas — independencia isActive/vigencia (Story B1)");
{
  const activoVencido = buildSocio({ id: 1, memberNumber: "M1", isActive: true, endDate: AYER });
  const inactivoVigente = buildSocio({ id: 2, memberNumber: "M2", isActive: false, endDate: MANANA });
  const sinMembresia = buildSocio({ id: 3, memberNumber: "M3", isActive: true, endDate: undefined });
  const visitaVencida = buildSocio({
    id: 4,
    memberNumber: "M4",
    isActive: true,
    membershipType: TipoMembresia.VISIT,
    endDate: AYER,
  });

  const stats = calcularEstadisticas([activoVencido, inactivoVigente, sinMembresia, visitaVencida]);

  assert(stats.activos === 3, "activos cuenta por isActive, independiente de vigencia (M1, M3, M4)");
  assert(stats.conMembresia === 1, "vigentes cuenta solo inactivoVigente (M2), sin importar isActive=false");
  assert(stats.vencidos === 2, "vencidos cuenta activoVencido y visitaVencida, sin importar membershipType");
  assert(
    stats.conMembresia + stats.vencidos < stats.total,
    "endDate==null (M3) no cuenta ni como vigente ni como vencido (AC-8)",
  );
  assert(stats.total === 4, "total = 4 (todos los socios, sin filtrar)");
}

console.log("\nfiltrarSocios — cards ignoran estado/vigencia, tabla los conserva (Story B1)");
{
  const activoVigente = buildSocio({ id: 10, memberNumber: "A10", name: "Ana", isActive: true, endDate: MANANA, membershipType: TipoMembresia.MONTH_GENERAL });
  const inactivoVencido = buildSocio({ id: 11, memberNumber: "A11", name: "Beto", isActive: false, endDate: AYER, membershipType: TipoMembresia.WEEK });
  const todos = [activoVigente, inactivoVencido];

  // Cards: estado/vigencia neutralizados a "todos" — deben incluir a ambos
  // sin importar el filtro de estado/vigencia que el admin tenga activo.
  const filtrosConEstadoActivos: SociosFiltros = { ...FILTROS_INICIALES, estado: "activos", vigencia: "vigentes" };
  const paraCards = filtrarSocios(todos, { ...filtrosConEstadoActivos, estado: "todos", vigencia: "todos" });
  assert(paraCards.length === 2, "cards ignoran estado y vigencia — incluyen a ambos socios (AC-1, AC-2)");

  // Tabla: SIN neutralizar — con estado=activos debe excluir al inactivo.
  const paraTabla = filtrarSocios(todos, filtrosConEstadoActivos);
  assert(paraTabla.length === 1 && paraTabla[0]?.id === 10, "tabla conserva el filtro de estado — excluye al inactivo (AC-5)");

  // Cards SÍ responden a búsqueda.
  const paraCardsConBusqueda = filtrarSocios(todos, {
    ...filtrosConEstadoActivos,
    estado: "todos",
    vigencia: "todos",
    busqueda: "Beto",
  });
  assert(
    paraCardsConBusqueda.length === 1 && paraCardsConBusqueda[0]?.id === 11,
    "cards responden a búsqueda (AC-3)",
  );

  // Cards SÍ responden a tipoMembresia.
  const paraCardsConTipo = filtrarSocios(todos, {
    ...filtrosConEstadoActivos,
    estado: "todos",
    vigencia: "todos",
    tipoMembresia: TipoMembresia.WEEK,
  });
  assert(
    paraCardsConTipo.length === 1 && paraCardsConTipo[0]?.id === 11,
    "cards responden a tipoMembresia (AC-4)",
  );

  // Default de tabla sigue siendo estado=activos (sin cambios, AC-6).
  assert(FILTROS_INICIALES.estado === "activos", "FILTROS_INICIALES.estado sigue siendo 'activos' (AC-6)");
}

console.log(`\n──────────────────────────────────────────`);
console.log(`socios-stats-semantics smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
