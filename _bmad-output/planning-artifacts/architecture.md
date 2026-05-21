---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: complete
completedAt: '2026-05-20'
inputDocuments:
  - _bmad-output/implementation-artifacts/investigations/sgf-analisis-estado-investigation.md
workflowType: architecture
project_name: sgf
user_name: Arturolora
date: '2026-05-20'
mode: existing-system-pending-decisions
---

# Architecture Decision Document — SGF

_Documento colaborativo. Secciones se agregan paso a paso. Base: sistema existente parcialmente implementado._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (confirmados en sistema existente):**

| Área | Scope |
|------|-------|
| Socios | CRUD completo, 11 tipos membresía, renovación, vigencia, estadísticas |
| POS / Ventas | Carrito, ticket UUID, cobro multi-producto, cancelación |
| Inventario | Entradas, salidas, traspasos WAREHOUSE↔GYM, ajustes, kardex |
| Cortes de caja | Open/close, resumen cajero, historial, estadísticas de pago |
| Productos | CRUD, stock dual-location, low-stock alert, membresías como productos |
| Reportes | Stock actual ✅; ventas por período ⚠️ pendiente; por socio ⚠️ pendiente |
| Auth | Login email/password, roles ADMIN/EMPLEADO, guards por ruta |
| Dashboard | Resumen operativo: corte activo, socios vencidos, stock bajo |

**Non-Functional Requirements:**

| NFR | Estado |
|-----|--------|
| Seguridad | ⚠️ Riesgo activo — endpoint sin auth |
| Aislamiento de datos por usuario | ✅ Cada op vinculada a `userId` |
| Consistencia transaccional | ✅ Parcial (Prisma transactions en inventory) |
| Ops multi-contexto coordinadas | ❌ Pendiente — FASE 3 orchestrator |
| Testabilidad | ❌ Ausente — 0% cobertura |
| Mantenibilidad | ✅ Alta — arquitectura documentada, capas separadas |

**Scale & Complexity:**

- Primary domain: Full-stack web (Next.js App Router)
- Complexity level: Medio-alto (multi-context ops, dual-location inventory, shift state machine)
- Multi-tenancy: No (single-gym per instance)
- Real-time: No requerido
- Data volume: Bajo-Medio (decenas socios, cientos movimientos/mes)

### Technical Constraints & Dependencies

1. Stack fijo: Next.js 16.1.1 + Prisma 6.19.2 + PostgreSQL + better-auth 1.4.12
2. Prisma client generado en `/app/generated/prisma/` — ubicación no estándar
3. `lib/db.ts` usa `@prisma/client` — posible dual instance
4. Sin tabla `Sale` independiente — ventas son `InventoryMovement[type=SALE]`
5. Arquitectura de 8 principios — cualquier decisión nueva debe cumplirlos

### Pending Architectural Decisions

| # | Decisión | Urgencia | Impacto |
|---|---------|---------|---------|
| D1 | FASE 3 Orchestrator — coordinación ops multi-contexto | Alta | Core |
| D2 | Dual Prisma client — unificar o aceptar | Alta | Infraestructura |
| D3 | `modules/sales/domain/` — estructura y responsabilidades | Media | Arquitectura |
| D4 | Estrategia de tests — niveles y prioridades | Alta | Calidad |
| D5 | Membership keywords — 3 fuentes → 1 centralización | Media | Mantenibilidad |
| D6 | `shifts.service.ts` — ¿migrar o declarar canónico en services/? | Baja | Arquitectura |
| D7 | Reportes — scope y arquitectura del módulo expandido | Media | Funcionalidad |
| D8 | `/api/inventory/ticket/[ticket]` — público intencional o fix | Alta | Seguridad |

---

## Stack Baseline (Existente — No Negociable)

**Runtime:** Node.js 20 + TypeScript 5.x
**Framework:** Next.js 16.1.1 (App Router)
**ORM:** Prisma 6.19.2 → PostgreSQL (Prisma Cloud managed)
**Auth:** better-auth 1.4.12 (email/password, Prisma adapter)
**Validación:** Zod (contratos en `types/api/`)
**Forms:** react-hook-form 7.71.1 + hookform/resolvers
**UI:** Tailwind CSS 4 + shadcn/ui + Radix UI + lucide-react
**Prisma client location:** `app/generated/prisma/` (non-standard)
**Arquitectura:** Layered DDD — 8 principios, Manager/Container pattern, modules/ canónico

---

## Core Architectural Decisions

### Decision Priority Analysis

**Críticas — bloquean producción:**
- D2: Dual Prisma client → unificar
- D8: Endpoint sin auth → fix
- D4: Tests base → vitest híbrido

**Importantes — dan forma a la arquitectura:**
- D1: Orchestrator layer → `lib/orchestrators/`
- D3: `modules/sales/domain/` → completar
- D5: Membership keywords → centralizar
- D6: `modules/shifts/` → migrar por consistencia
- D7: `modules/reports/` → migrar + scope mínimo definido

**Diferidas — no bloquean, arquitectura preparada:**
- D9: Excel Import → adapter layer futuro

---

### D1: Application Service Orchestrator Layer

**Decisión:** Crear `lib/orchestrators/` como capa de coordinación para use cases multi-módulo.

**Reglas:**
- Los orchestrators importan múltiples services; los services NUNCA se importan entre sí
- Las rutas API llaman al orchestrator solo cuando el use case cruza módulos; si es single-module, van directo al service
- Los orchestrators son delgados: coordinación + transacción + orden de pasos. Cero lógica de dominio
- La lógica de dominio permanece en `modules/*/domain` o `lib/domain`
- Máximo 2–3 orchestrators iniciales

**Orchestrators iniciales:**
```
lib/orchestrators/
  membership-sale.orchestrator.ts   ← InventoryService + MembersService
  renewal.orchestrator.ts           ← MembersService + InventoryService
  shift-close.orchestrator.ts       ← ShiftsService + ReportsService (si cruza)
```

**Relación con D9 (Excel Import):**
Excel adapter → orchestrator → services → Prisma. El adapter nunca escribe directo a Prisma.

**Rationale:** Sistema monolítico de bajo volumen. Domain Events sería over-engineering. Coordinar desde routes viola P-2. Orchestrator layer da estructura sin complejidad accidental.

---

### D2: Unificar Prisma Client en Canonical

**Decisión:** Todos los imports de Prisma migran al cliente generado. Ruta canónica depende del tipo de import.

**⚠️ Hallazgo Prisma 6 (validado en implementación 2026-05-20):**

Prisma 6 con `provider = "prisma-client-js"` y `output` custom genera `client.ts` con `@ts-nocheck` + `enums.ts` **vacío**. TypeScript resuelve `@/app/generated/prisma/client` → `client.ts` (`.ts` > `.d.ts`), que no exporta enums ni tipos query completos. La ruta `@/app/generated/prisma/client` **solo funciona para importar `PrismaClient` class**.

Para enums y tipos query (`UserWhereInput`, etc.), TypeScript debe resolver → `index.d.ts`, que solo ocurre via el root del paquete.

**Regla implementada:**

```typescript
// ✅ PrismaClient (class) — solo en lib/db.ts y lib/auth.ts
import { PrismaClient } from '@/app/generated/prisma'

// ✅ Enums y tipos — todos los services y módulos
import { MembershipType, InventoryType, PaymentMethod } from '@/app/generated/prisma'

// ❌ NO USAR — enums no se exportan desde este sub-path en Prisma 6
import { MembershipType } from '@/app/generated/prisma/client'

// ❌ NO USAR — @prisma/client apunta a node_modules stale (sin isActive, etc.)
import { MembershipType } from '@prisma/client'
```

**Excepción intencional:**
- `lib/auth.ts` importa `PrismaClient` desde `@/app/generated/prisma/client` — **NO modificar**. Es una instancia separada requerida por better-auth. Esta excepción es permanente e intencional.

**Impacto real:** 9 archivos cambiados (ver Story 1.2). Build pasa sin errores.

**Rationale:** `tsconfig.json` mapea `@prisma/client` → `./app/generated/prisma` pero ese alias puede confundir. El root `@/app/generated/prisma` es explícito, elimina ambigüedad, y resuelve correctamente a `index.d.ts` con todos los tipos generados.

---

### D3: `modules/sales/domain/` — Completar Migración

**Decisión:** Crear la capa domain en sales con estructura canónica.

```
modules/sales/
  sales.service.ts          ← ya existe
  types.ts                  ← crear
  domain/
    index.ts
    grouping.ts             ← groupTickets(), sortTickets()
    filters.ts              ← filterByDate(), filterByCashier(), filterByProduct()
    calculations.ts         ← calculateHistorialStats()
    formatters.ts           ← re-export desde lib/domain/sales/history-formatting
```

**Rationale:** Consistencia estructural con members, products, inventory.

---

### D4: Estrategia de Tests — Vitest Híbrido

**Decisión:** Vitest como framework. Estrategia híbrida por nivel.

**Framework:** Vitest (TypeScript nativo, ESM compatible, mínima configuración con Next.js 16+)

**Niveles:**

| Nivel | Herramienta | Cuándo |
|-------|-------------|--------|
| Unit (domain puro) | Vitest sin DB | Inmediato — prioridad alta |
| Integration críticos | Vitest + `DATABASE_URL_TEST` real | Flujos críticos de negocio |
| Integration secundarios | Vitest + mocks de Prisma | Services sin lógica de DB compleja |
| E2E | Diferido | Post-MVP |

**Flujos críticos con DB real:**
`createSale`, `renewMembership`, `openShift/closeShift`, `adjustment/transfer`, `membership validity calculation`, futuro Excel import

**Reglas:**
- `DATABASE_URL_TEST` separada — NUNCA contra Prisma Cloud productivo
- Tests sin DB disponible: `it.skip()` explícito, no fallos silenciosos
- Meta: base mínima de confianza, no suite perfecta
- No buscar 100% coverage inicial; priorizar regresión de negocio y smoke tests
- Si la DB de test no está disponible en CI, los integration tests quedan preparados y skipped

---

### D5: Membership Keywords — Single Source of Truth

**Decisión:** Centralizar en `lib/domain/shared/constants.ts`.

**Problema actual:** 3 arrays independientes en:
- `services/membership-helpers.ts` → `MEMBERSHIP_KEYWORDS`
- `modules/inventory/domain/formatters.ts` → `KEYWORDS_MEMBRESIA`
- `modules/products/domain/helpers.ts` → `MEMBERSHIP_PATTERNS`

**Solución:**
```typescript
// lib/domain/shared/constants.ts
export const MEMBERSHIP_KEYWORDS = [
  'EFECTIVO', 'VISITA', 'MENSUALIDAD', 'SEMANA',
  'TRIMESTRE', 'ANUAL'
] as const
```

Los 3 archivos importan desde ahí. `services/membership-helpers.ts` queda como re-export delgado o se elimina.

**Rationale:** Agregar un tipo de membresía nunca más debería requerir actualizar 3 archivos.

---

### D6: Migrar `shifts` → `modules/shifts/`

**Decisión:** Mover `services/shifts.service.ts` a `modules/shifts/` por consistencia estructural.

**Alcance:**
- Mover el service file
- Crear estructura `modules/shifts/domain/` (puede tener archivos mínimos inicialmente)
- Preservar el header de auditoría FASE 8E como documentación de decisión — documenta por qué no hay extracción profunda a domain aún
- Reconciliar contratos de `lib/domain/shifts/` con el service cuando los tipos sean compatibles

**Principio aplicado (P-9):** Todos los contextos de negocio bajo `modules/`. Consistencia estructural es valor del sistema, no solo la funcionalidad.

**Estado de `services/` al completar roadmap:**
```
services/
  enum-mappers.ts       ← infraestructura de layer-bridging (queda)
  utils.ts              ← utilidades transversales (queda)
  index.ts              ← re-export hub (se actualiza)
  [todo lo demás migrado a modules/]
```

---

### D7: Módulo de Reportes — Migrar y Scope Mínimo

**Decisión:** Migrar `reports.service.ts` → `modules/reports/` por consistencia. Scope conservador y extensible.

**Reportes mínimos a contemplar:**

| Reporte | Datos disponibles |
|---------|-----------------|
| Stock actual y bajo stock | ✅ En DB |
| Ventas por período | ✅ InventoryMovement[SALE] |
| Ventas por método de pago | ✅ MetodoPago en movimientos |
| Cortes por cajero/turno | ✅ Shift + User |
| Socios activos, vencidos, próximos a vencer | ✅ Member + membershipEnd |
| Renovaciones/membresías por período | ✅ InventoryMovement relacionado |
| Exportación/compatibilidad Excel | ⏳ Diferido — arquitectura preparada |

**Regla:** No construir reportes avanzados sin validar necesidades reales con el dueño. El módulo se diseña para crecer.

**Referencia:** Los Excel de `docs/` son la operación real actual. Cualquier brecha entre datos del Excel y lo que el sistema puede reportar debe identificarse como backlog explícito.

**Prioridad:** Después de D2, D8, D4, D1 y migración estructural (D3, D5, D6).

---

### D8: Endpoint Público de Ticket → Autenticado

**Decisión:** `app/api/inventory/ticket/[ticket]/route.ts` agrega auth check. Tratarlo como endpoint interno autenticado.

**Fix:**
```typescript
// Agregar al inicio del handler — idéntico a todos los demás endpoints
const session = await auth.api.getSession({ headers: await headers() })
if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
```

**Patrón futuro para tickets públicos (si se requiere):**
- Endpoint separado y explícitamente documentado como público
- DTO limitado (sin datos de cajero, userId, datos internos)
- Rate limiting
- Token temporal de expiración o UUID de acceso único
- Completamente separado del flujo administrativo autenticado

**Rationale:** El endpoint actual no tiene caso de uso público confirmado. La omisión fue por error. Consistencia de seguridad > conveniencia.

---

### D9: Arquitectura para Excel Import (Diferida)

**Decisión:** No implementar ahora. Diseñar el sistema para que esta capacidad sea añadible sin romper capas existentes.

**Contexto:** Los archivos `docs/socios.xlsx`, `docs/cortes.xlsx`, `docs/corte mañana.xlsx` son contratos operativos externos reales del gimnasio. A futuro el sistema deberá:
- Recibir/importar Excel reales
- Validar columnas contra schema del dominio
- Mapear campos Excel → modelos internos
- Reportar errores de importación con feedback útil al operador
- Tolerar variaciones menores de formato

**Arquitectura preparada:**
```
lib/adapters/
  excel/
    socio-excel.adapter.ts       ← Excel row → CrearSocioInput
    corte-excel.adapter.ts       ← Excel row → datos de corte
    [context]-excel.adapter.ts
```

**Reglas para no bloquear esta capacidad futura:**
1. Los tipos de dominio deben tener mapeadores de entrada separados de los mapeadores de Prisma
2. El parser de Excel es una capa adapter — nunca en service, nunca en domain, nunca escribe directo a Prisma
3. Los adapters de Excel coordinan a través de orchestrators (D1), no de services directos
4. Los campos del dominio no se renombran sin evaluar el impacto en los mapeos Excel esperados
5. Cuando se implemente: agregar unit tests de mapping con fixtures reales de los xlsx actuales

---

### Decision Impact Analysis

**Sequence de implementación recomendada:**

```
Fase A — Seguridad + Infraestructura (bloqueantes)
  1. D8: Fix endpoint sin auth (5 líneas)
  2. D2: Unificar Prisma client (1 archivo)

Fase B — Base de calidad
  3. D4: Setup Vitest + unit tests domain puro
  4. D4: Integration tests flujos críticos (createSale, renewMembership, shifts)

Fase C — Completar consistencia estructural
  5. D5: Centralizar membership keywords
  6. D3: Crear modules/sales/domain/
  7. D6: Migrar shifts → modules/shifts/
  8. D7: Migrar reports → modules/reports/

Fase D — Nuevas capacidades
  9. D1: Implementar orchestrators (lib/orchestrators/)
  10. D7: Ampliar reportes (ventas por período, socios, cortes)

Fase E — Futuro
  11. D9: Excel import adapter layer
```

**Dependencias cruzadas:**
- D5 debe preceder a cualquier adición de tipo de membresía
- D1 orchestrators dependen de que D6 (shifts) esté migrado
- D9 Excel import depende de D1 (orchestrators como coordinadores)
- Los integration tests (D4) se benefician de que D2 (Prisma unificado) esté resuelto primero

---

## Implementation Patterns

### P-01: Service Method Structure

```typescript
export async function createMember(
  input: CrearSocioInput,      // tipo de dominio, NO payload HTTP crudo
  userId: string               // contexto de sesión explícito
): Promise<SocioResponse> {   // tipo serializado, NO tipo Prisma
  const data = buildCrearSocioPayload(input)
  const result = await prisma.member.create({ data })
  return serializeMember(result)
}
```
❌ `input: any` | retornar tipo Prisma raw | lógica de negocio inline sin delegar a domain

---

### P-02: Input Parsing en Service (no en route)

```typescript
// service file
export function parseCreateMemberInput(raw: unknown): CrearSocioInput {
  const validated = CreateMemberInputSchema.parse(raw)
  return { nombre: validated.name, ... }
}
// route
const input = MembersService.parseCreateMemberInput(await request.json())
```
❌ Parsear directamente en route sin pasar por helper del service

---

### P-03: Route Canónica

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const input = ServiceName.parseXxxInput(await request.json())
    const result = await ServiceName.doSomething(input, session.user.id)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
```
❌ Lógica condicional de negocio en route | Auth check omitido

---

### P-04: Manager Component

```typescript
'use client'
export function [Context]Manager({ initialData }: Props) {
  const [items, setItems] = useState(initialData)
  const filtered = useMemo(() => filterItems(items, filters), [items, filters])
  const paginated = useMemo(() => paginar(filtered, page, PAGE_SIZE), [filtered, page])
  const handleCreate = async (data) => { await createItem(data); await reload() }
  return <PresentationalComponent data={paginated} onAction={handleCreate} />
}
```
❌ Fetch en componente presentacional | Lógica de dominio en JSX

---

### P-05: Domain Function

```typescript
// Sin imports de Prisma, HTTP ni env
export function filtrarSocios(socios: Socio[], filtros: SociosFiltros): Socio[] {
  return socios.filter(s => matchesBusqueda(s, filtros.busqueda))
}
```
❌ `import { prisma }` en `domain/` | `fetch()` en `domain/`

---

### P-06: Orchestrator Structure

```typescript
// lib/orchestrators/membership-sale.orchestrator.ts
export async function processMembershipSale(
  input: MembershipSaleInput,
  userId: string
): Promise<MembershipSaleResult> {
  return await prisma.$transaction(async (tx) => {
    const movement = await InventoryService.createSale(input.saleData, userId, tx)
    await MembersService.registerVisit(input.memberId, tx)
    return { movement }
  })
}
```
❌ Lógica de dominio en orchestrator | Services importándose entre sí

---

### P-07: Module Folder Layout

```
modules/[context]/
  [context].service.ts
  types.ts
  domain/
    index.ts
    calculations.ts
    filters.ts
    formatters.ts
    payloads.ts
    validations.ts
```
No todos los archivos son obligatorios — los que existen siguen este naming exacto.

---

### P-08: Error Response Shape

```typescript
{ error: string }    // 4xx, 5xx — SIEMPRE este campo
// ❌ NO usar { message: string } en errores
```
El caso `shifts/active` usa `message` — es una inconsistencia existente a corregir.

---

### P-09: External Adapters

```
lib/adapters/
  excel/
    socios.adapter.ts      ← ExcelRow → CrearSocioInput[]
    cortes.adapter.ts
    validators.ts
    mappers.ts
```

**Reglas:**
- Nunca importan `prisma`
- Nunca contienen lógica de negocio
- Output: `{ rows: T[], errors: ImportError[] }` — nunca lanzan silenciosamente
- Flujo: `Excel → adapter → orchestrator → services → Prisma`
- Los Excel son contratos operativos externos, no extensiones del modelo interno

---

### P-10: Serialización Explícita en API Boundary

Tipos que NUNCA salen raw de Prisma:

```typescript
Decimal → number         // serializeDecimal()
Date    → ISO string     // .toISOString()
BigInt  → number
Enums   → string literal // mapXxx()
```

Serializers viven en el módulo del service que los usa. `serializeMember()` en `members.service.ts`, etc.
❌ Retornar `prisma.member.findMany()` directamente en route o client

---

### P-11: Naming Conventions (Consistencia Fuerte)

```
modules/[context]/[context].service.ts
modules/[context]/domain/calculations.ts
modules/[context]/domain/filters.ts
modules/[context]/domain/formatters.ts
modules/[context]/domain/payloads.ts
modules/[context]/domain/validations.ts

app/(dashboard)/[context]/_components/[context]-manager.tsx
app/(dashboard)/[context]/_components/[context]-filters.tsx
app/(dashboard)/[context]/_components/[context]-lista.tsx
app/(dashboard)/[context]/_components/[context]-stats.tsx
app/(dashboard)/[context]/_components/[context]-skeleton.tsx

lib/api/[context].client.ts
lib/orchestrators/[use-case].orchestrator.ts
lib/adapters/[format]/[context].[format].adapter.ts
```

❌ Aliases, nombres creativos, variaciones entre módulos similares. La predictibilidad es prioridad arquitectónica.

---

### P-12: Imports de Prisma

```typescript
// ✅ Única fuente canónica para todo (PrismaClient, enums, tipos)
import { PrismaClient } from '@/app/generated/prisma'
import { MembershipType, InventoryType, PaymentMethod, Location, Role } from '@/app/generated/prisma'

// ✅ Excepción permanente: lib/auth.ts usa /client (instancia separada para better-auth)
import { PrismaClient } from '@/app/generated/prisma/client'  // SOLO en lib/auth.ts
```

❌ `from "@prisma/client"` | `from "@/app/generated/prisma/client"` (excepto lib/auth.ts)

> **Razón técnica (Prisma 6):** `@/app/generated/prisma/client` resuelve a `client.ts` (TypeScript prefiere `.ts` sobre `.d.ts`). Ese archivo tiene `enums.ts` vacío — enums y tipos query no se exportan. El root `@/app/generated/prisma` resuelve a `index.d.ts` con exportaciones completas.

---

### Patterns Summary

| ID | Patrón | Violación a evitar |
|----|--------|-------------------|
| P-01 | Service method | Retornar tipo Prisma raw |
| P-02 | Input parsing en service | Parsear en route.ts |
| P-03 | Route canónica | Lógica de negocio en route |
| P-04 | Manager component | Fetch en presentacional |
| P-05 | Domain function | `import { prisma }` en domain/ |
| P-06 | Orchestrator | Lógica de dominio en orchestrator |
| P-07 | Module layout | Nombres creativos o inconsistentes |
| P-08 | Error shape | Usar `message` en errores |
| P-09 | Adapters | Adapter escribiendo directo a DB |
| P-10 | Serialización | Tipo Prisma cruzando API boundary |
| P-11 | Naming | Variaciones de nombre entre módulos |
| P-12 | Imports Prisma | `@prisma/client` o `/client` para enums |

---

## Project Structure & Boundaries

### Estructura Objetivo (post-roadmap D1–D9)

```
sgf/
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env                            ← real (gitignored)
├── .env.example
├── CLAUDE.md
│
├── prisma/
│   ├── schema.prisma               ← fuente de verdad del schema
│   ├── seed.ts
│   └── migrations/
│
├── app/
│   ├── generated/prisma/           ← Prisma client canónico (D2)
│   ├── layout.tsx
│   ├── (auth)/sign-in/page.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx
│   │   ├── _components/            ← dashboard.container.tsx + presentacionales
│   │   ├── ventas/
│   │   ├── socios/
│   │   ├── productos/
│   │   ├── cortes/
│   │   ├── inventario/
│   │   ├── historial-ventas/
│   │   └── reports/
│   └── api/
│       ├── auth/[...all]/route.ts
│       ├── inventory/              ← 9 routes
│       ├── members/                ← 5 routes
│       ├── products/               ← 1 route
│       ├── sales/                  ← 3 routes
│       └── shifts/                 ← 5 routes
│
├── modules/                        ← dominio canónico (todos los contextos)
│   ├── members/
│   │   ├── members.service.ts
│   │   ├── types.ts
│   │   └── domain/
│   │       ├── index.ts
│   │       ├── calculations.ts
│   │       ├── calculations.test.ts  ← test co-locado (D4 ajuste)
│   │       ├── filters.ts
│   │       ├── filters.test.ts
│   │       ├── formatters.ts
│   │       └── payloads.ts
│   ├── products/
│   │   ├── products.service.ts
│   │   ├── types.ts
│   │   └── domain/
│   │       ├── index.ts
│   │       ├── calculations.ts
│   │       ├── calculations.test.ts
│   │       ├── filters.ts
│   │       ├── helpers.ts
│   │       └── validations.ts
│   ├── inventory/
│   │   ├── inventory.service.ts
│   │   ├── types.ts
│   │   └── domain/
│   │       ├── index.ts
│   │       ├── calculations.ts
│   │       ├── filters.ts
│   │       ├── formatters.ts
│   │       └── pagination.ts
│   ├── sales/                      ← D3: completar domain/
│   │   ├── sales.service.ts
│   │   ├── types.ts
│   │   └── domain/
│   │       ├── index.ts
│   │       ├── grouping.ts
│   │       ├── grouping.test.ts
│   │       ├── filters.ts
│   │       ├── calculations.ts
│   │       └── formatters.ts
│   ├── shifts/                     ← D6: migrado desde services/
│   │   ├── shifts.service.ts
│   │   ├── types.ts
│   │   └── domain/
│   │       ├── index.ts
│   │       ├── shift-calculations.ts
│   │       └── shift-formatters.ts
│   ├── reports/                    ← D7: migrado + expandido
│   │   ├── reports.service.ts
│   │   ├── types.ts
│   │   └── domain/
│   │       ├── index.ts
│   │       ├── calculations.ts
│   │       └── formatters.ts
│   └── users/
│       ├── users.service.ts
│       ├── types.ts
│       └── domain/index.ts
│
├── lib/
│   ├── db.ts                       ← D2: import desde app/generated/prisma/
│   ├── auth.ts
│   ├── auth-client.ts
│   ├── utils.ts
│   ├── navigation.ts
│   ├── require-role.ts
│   ├── api/                        ← HTTP clients (solo desde Manager)
│   │   ├── members.client.ts
│   │   ├── products.client.ts
│   │   ├── inventory.client.ts
│   │   ├── sales.client.ts
│   │   ├── shifts.client.ts
│   │   └── reports.client.ts
│   ├── orchestrators/              ← D1: nueva capa
│   │   ├── membership-sale.orchestrator.ts
│   │   ├── renewal.orchestrator.ts
│   │   └── shift-close.orchestrator.ts
│   ├── adapters/                   ← D9: futura capa
│   │   └── excel/
│   │       ├── socios.adapter.ts
│   │       ├── cortes.adapter.ts
│   │       ├── validators.ts
│   │       └── mappers.ts
│   └── domain/                     ← TRANSITIONAL — ver regla abajo
│       └── shared/                 ← permanente: cross-context primitives
│           ├── constants.ts        ← D5: MEMBERSHIP_KEYWORDS único
│           ├── pagination.ts
│           ├── formatters.ts
│           ├── types.ts
│           └── index.ts
│           [sales/, shifts/, reports/ se vacían conforme se migra a modules/]
│
├── services/                       ← post-roadmap: solo infraestructura
│   ├── index.ts                    ← re-export hub (se actualiza en migración)
│   ├── enum-mappers.ts             ← layer bridge (permanente)
│   └── utils.ts                    ← utilidades transversales (permanente)
│
├── types/
│   ├── api/                        ← Zod schemas + tipos HTTP
│   └── models/                     ← Domain model types + enums
│
├── components/
│   ├── ui/                         ← shadcn/ui primitives
│   └── layout/                     ← Sidebar, Header, ThemeToggle
│
├── docs/                           ← contratos operativos externos (NO tocar)
│   ├── socios.xlsx
│   ├── cortes.xlsx
│   └── corte mañana.xlsx
│
└── tests/                          ← integration + fixtures (centralizados)
    ├── integration/
    │   ├── members.service.test.ts
    │   ├── inventory.service.test.ts
    │   ├── shifts.service.test.ts
    │   └── orchestrators/
    │       └── membership-sale.test.ts
    ├── fixtures/
    │   ├── members.fixture.ts
    │   ├── products.fixture.ts
    │   └── shifts.fixture.ts
    └── setup/
        ├── db.setup.ts             ← DATABASE_URL_TEST + cleanup
        └── vitest.config.ts
```

### Regla de Co-locación de Tests

**Unit tests de domain puro → co-locados junto al archivo:**
```
modules/members/domain/calculations.ts
modules/members/domain/calculations.test.ts   ← junto al código
```

**Integration tests → centralizados en `/tests/`:**
```
tests/integration/members.service.test.ts
tests/integration/orchestrators/membership-sale.test.ts
```

**Criterio:** Si el test necesita DB, fixtures globales, o múltiples módulos → va en `/tests/`. Si es una función pura con inputs/outputs simples → va co-locado.

---

### Regla de lib/domain/ — Estado Transitional

`lib/domain/` es una capa **transitional**. Su destino final:

```
lib/domain/shared/    ← PERMANENTE: primitives cross-context
                        (pagination, formatters, constants, types)

lib/domain/sales/     ← TRANSITIONAL: migrar a modules/sales/domain/
lib/domain/shifts/    ← TRANSITIONAL: migrar a modules/shifts/domain/
lib/domain/reports/   ← TRANSITIONAL: migrar a modules/reports/domain/
```

**Reglas:**
- `lib/domain/shared/` puede crecer pero solo con lógica genuinamente compartida entre múltiples contextos
- Nunca crear `lib/domain/[nuevo-contexto]/` si el contexto ya tiene o debería tener su módulo en `modules/`
- Cuando un contexto migre: vaciar su `lib/domain/[contexto]/`, mover código a `modules/[contexto]/domain/`, actualizar imports
- La pregunta de "¿esto va en modules/ o lib/domain?" tiene respuesta única: **módulos de negocio van en `modules/`**; solo utilidades cross-context van en `lib/domain/shared/`

---

### Fronteras Arquitectónicas

**Tabla de dependencias permitidas:**

| Capa origen \ Destino | Prisma | Services | Orchestrators | Domain | API Client | Adapters |
|-----------------------|--------|----------|---------------|--------|------------|----------|
| **Route** | ❌ | ✅ directo | ✅ si multi-ctx | ❌ | ❌ | ❌ |
| **Service** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Orchestrator** | ✅ ($tx) | ✅ múltiples | ❌ | ❌ | ❌ | ❌ |
| **Domain** | ❌ | ❌ | ❌ | ✅ shared | ❌ | ❌ |
| **Manager (UI)** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Presentacional** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Adapter** | ❌ | ❌ | ✅ output | ❌ | ❌ | ❌ |

**Flujo completo:**
```
HTTP → route.ts (auth + parse) → Service | Orchestrator → Prisma
                                      ↑
                              domain/ (pure functions)

Excel → lib/adapters/excel/ → Orchestrator → Services → Prisma

Page.tsx (server) → Service/Prisma → Manager (client)
                                          ↓ useMemo + domain
                                    Presentational (props)
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** Todas las decisiones son compatibles. Next.js 16 + Prisma 6 + better-auth + Vitest son compatibles con ESM nativo. No hay contradicciones.

**Dependencias entre decisiones verificadas:** D1→D6, D4→D2, D9→D1. Secuencia de implementación (Fases A–E) las respeta.

**Pattern Consistency:** P-01–P-11 alineados con sus decisiones correspondientes. Sin conflictos entre patrones.

### Requirements Coverage Validation ✅

Todos los 8 contextos funcionales tienen módulo + route(s) + manager. NFRs cubiertos: seguridad (D8+P-03), transacciones (D1), testabilidad (D4), mantenibilidad (D5+D6+D7), compatibilidad Excel (D9).

### Implementation Readiness Validation ✅

9 decisiones (D1–D9) con rationale, reglas y dependencias. 11 patrones (P-01–P-11) con código de ejemplo y anti-patterns. Árbol de proyecto completo y específico. Secuencia de implementación en 5 fases.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Contexto del proyecto analizado exhaustivamente
- [x] Escala y complejidad evaluadas
- [x] Restricciones técnicas identificadas
- [x] Concerns cross-cutting mapeados

**Architectural Decisions**
- [x] Decisiones críticas documentadas (D1–D9)
- [x] Stack tecnológico completamente especificado
- [x] Patrones de integración definidos
- [x] Filosofía de performance documentada (ver abajo)

**Implementation Patterns**
- [x] Convenciones de naming establecidas (P-11)
- [x] Patrones de estructura definidos (P-07)
- [x] Patrones de comunicación especificados (P-03, P-04)
- [x] Patrones de proceso documentados (P-08, P-10)

**Project Structure**
- [x] Estructura de directorios completa y específica
- [x] Fronteras de componentes establecidas
- [x] Puntos de integración mapeados
- [x] Mapping de requisitos a estructura completo

### Architecture Readiness Assessment

**Overall Status: ✅ READY FOR IMPLEMENTATION**

**Confidence Level: Alto**

**Gaps menores documentados (no bloqueantes):**
- Error boundaries frontend (`error.tsx`) — definir en primera story de UI
- Logging estructurado — agregar en Fase D junto con orchestrators
- CI/CD pipeline — post-MVP

---

## D10: Prioridad de Compatibilidad Operativa

**Decisión:** La operación real del gimnasio (documentada en los Excel) tiene prioridad sobre features avanzadas o especulativas.

**Fuentes de verdad operativa:**
- `docs/socios.xlsx` — 656 socios reales, enero 2026
- `docs/cortes.xlsx` — turno FN-248, 34 tickets, $6,344 MXN
- `docs/corte mañana.xlsx` — turno FN-249, 5 tickets, $1,940 MXN

**Regla de priorización:**
- Funcionalidad evidenciada en Excel + operación diaria → **prioritaria**
- Funcionalidad en sistema sin evidencia operativa → **secundaria hasta validación con dueño**

**MVP scope (orden de prioridad):**
1. Cortes / caja — apertura, cierre, fondo, retiros, arqueo
2. Ventas — ticket, socio, producto, EFECTIVO, por vendedor
3. Socios — folio, membresía, fechas, visitas
4. Inventario — 56 productos, dual-location, movimientos
5. Reportes equivalentes a las 7 hojas del corte Excel

**Deprioritizado hasta validación con dueño:**
- `CREDIT_CARD`, `TRANSFER` payment methods — solo EFECTIVO evidenciado en todos los tickets
- `NUTRITION_CONSULTATION`, `REBIRTH` membership types — sin ocurrencias en socios.xlsx
- Reportes avanzados y dashboards complejos
- Features especulativas sin evidencia operativa

**Hallazgos de schema verification (Mayo 2026):**

| Concepto Excel | Campo schema | Estado |
|----------------|-------------|--------|
| Fondo Caja | `Shift.initialCash` | ✅ Existe |
| Retiros (total + concepto) | `Shift.totalWithdrawals` + `withdrawalsConcept` | ⚠️ Solo agregado — no registros individuales |
| Fecha Nacimiento socio | `Member.birthDate` | ✅ Existe |
| Total Visitas socio | `Member.totalVisits` | ✅ Existe |
| Última Visita socio | `Member.lastVisit` | ✅ Existe |
| Código Postal socio | — | ❌ No existe (bajo impacto) |
| Desglose IVA turno | `Shift.productSales0Tax` / `productSales16Tax` | ✅ Existe |
| Diferencia de arqueo | `Shift.difference` | ✅ Existe |

**Gap resuelto — ver D11.**
Retiros individuales por turno modelados en `CashWithdrawal`.

---

## D11: Modelo CashWithdrawal — Retiros Individuales de Caja

**Decisión:** Agregar tabla `cash_withdrawal` para registrar retiros individuales de efectivo durante un turno activo.

### Schema (nuevo modelo)

```prisma
model CashWithdrawal {
  id        Int      @id @default(autoincrement())
  shiftId   Int
  userId    String                     // quién hizo el retiro
  amount    Decimal  @db.Decimal(10, 2) // siempre positivo, > 0
  concept   String                     // texto libre — no enum
  createdAt DateTime @default(now())   // hora del evento

  shift Shift @relation(fields: [shiftId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@index([shiftId])
  @@map("cash_withdrawal")
}
```

Cambio en `Shift`: agregar `cashWithdrawals CashWithdrawal[]`.

### Reglas de negocio (no negociables)

**R1 — Solo en turnos abiertos:**
```typescript
// Turno abierto = closingDate IS NULL (no existe campo status en Shift)
// El schema usa closingDate para determinar estado:
//   abierto  = closingDate === null
//   cerrado  = closingDate !== null  (patrón existente en shifts.service.ts:274)

if (shift.closingDate !== null) {
  throw new Error("Solo se pueden registrar retiros en turnos abiertos")
}
```

**R2 — Montos positivos mayores a cero:**
```typescript
if (amount <= 0) {
  throw new Error("El monto del retiro debe ser mayor a cero")
}
```

**R3 — Historial inmutable:**
- Los registros de `CashWithdrawal` no se editan ni eliminan
- Si hay error: registrar un nuevo movimiento correctivo con concepto explícito
- O ajustar `Shift.totalWithdrawals` manualmente al cierre con nota en `Shift.notes`
- Nunca mutar historial silenciosamente

### Integración con Shift

`Shift.totalWithdrawals` pasa a ser caché denormalizado:
```typescript
// En createWithdrawal:
await prisma.$transaction([
  prisma.cashWithdrawal.create({ data: { shiftId, userId, amount, concept } }),
  prisma.shift.update({
    where: { id: shiftId },
    data: { totalWithdrawals: { increment: amount } }
  })
])
```

`Shift.withdrawalsConcept` → deprecar gradualmente (campo legacy, ya no necesario con registros individuales).

Al cerrar turno: `closeShift()` recalcula `totalWithdrawals = SUM(cashWithdrawals.amount)` para garantizar consistencia.

### Responsabilidad de servicio

Métodos nuevos en `shifts.service.ts` (o `modules/shifts/` post-D6):
- `createWithdrawal(shiftId, userId, amount, concept)` → crea registro + actualiza caché
- `getWithdrawalsByShift(shiftId)` → lista para reporte equivalente a hoja "Retiros" del Excel

### Lo que NO incluye (intencional)

- Sin `status` en CashWithdrawal — los retiros no tienen ciclo de vida
- Sin categorías/tipos de retiro — `concept` texto libre es suficiente
- Sin aprobaciones ni autorización adicional
- Sin balance de caja en tiempo real
- Sin reversión — solo corrección hacia adelante

### Impacto en reportes

| Hoja Excel | Antes | Después |
|------------|-------|---------|
| Cierre → Total Retiros | `Shift.totalWithdrawals` (manual) | Mismo campo + calculado desde registros |
| Retiros → lista individual | ❌ No existía | ✅ `cashWithdrawals WHERE shiftId` |

### Migración de schema

Additive — no toca datos existentes:
1. `CREATE TABLE cash_withdrawal`
2. `ALTER TABLE shift ADD FOREIGN KEY`
3. `ALTER TABLE user ADD FOREIGN KEY`

---

## Performance Philosophy

### Regla: Claridad y Mantenibilidad sobre Optimización Prematura

SGF es un sistema de gimnasio local (single-gym, bajo/medio tráfico). La arquitectura prioriza en este orden:

1. **Claridad** — el código debe ser legible y predecible
2. **Mantenibilidad** — cambios locales sin efectos globales
3. **Consistencia** — mismo patrón en todos los módulos
4. **Velocidad de desarrollo** — shipping real > perfección teórica

**Regla explícita anti-over-engineering:**

> No introducir las siguientes tecnologías sin evidencia real y medible de necesidad:
> - Caching distribuido (Redis, Memcached)
> - Message queues o event buses (Kafka, RabbitMQ, BullMQ)
> - Microservicios o separación de procesos
> - GraphQL sobre REST existente
> - Edge functions / serverless fragmentado
> - WebSockets o SSE para features que pueden ser polling

**Protocolo de decisión de performance:**

```
1. ¿Hay evidencia de lentitud real? (métrica, no intuición)
2. ¿Se midió el bottleneck exacto?
3. ¿La solución más simple resuelve el 80% del problema?
4. Si sí → implementar lo simple primero
5. Performance avanzada: solo post-MVP + post-validación operativa real
```

**Contexto que protege esta regla:** Un gimnasio local tiene decenas de socios activos, cientos de movimientos por mes, 2–3 usuarios concurrentes en horas pico. Una query Prisma bien indexada es suficiente para años de operación normal.

---

## Implementation Handoff

**Secuencia de implementación (Fases A–E):**

```
Fase A — Seguridad + Infraestructura (bloqueantes de producción)
  1. D8: Fix /api/inventory/ticket/[ticket] — agregar auth check (5 líneas)
  2. D2: Actualizar lib/db.ts — import desde app/generated/prisma/

Fase B — Base de calidad
  3. D4: Setup Vitest (vitest.config.ts, tests/setup/db.setup.ts)
  4. D4: Unit tests domain puro — members, products, inventory, sales
  5. D4: Integration tests — createSale, renewMembership, openShift/closeShift

Fase C — Consistencia estructural
  6. D5: Centralizar MEMBERSHIP_KEYWORDS en lib/domain/shared/constants.ts
  7. D3: Crear modules/sales/domain/ (grouping, filters, calculations, formatters)
  8. D6: Migrar services/shifts.service.ts → modules/shifts/
  9. D7: Migrar services/reports.service.ts → modules/reports/
  10. Migrar services/users.service.ts → modules/users/

Fase D — Nuevas capacidades
  11. D1: Implementar lib/orchestrators/ (membership-sale, renewal, shift-close)
  12. D7: Ampliar módulo de reportes (ventas por período, socios, cortes por cajero)
  13. P-08: Corregir inconsistencia shifts/active (message → error)

Fase E — Futuro
  14. D9: lib/adapters/excel/ cuando se valide necesidad real
```

**Para cualquier agente AI que implemente este sistema:**
- Este documento es la fuente de verdad arquitectónica
- Toda nueva funcionalidad sigue los patrones P-01–P-11
- Toda nueva estructura respeta el folder layout del árbol objetivo
- Ante duda de ubicación: `modules/[context]/` para dominio de negocio, `lib/` para infraestructura compartida
- Consultar `CLAUDE.md` para reglas adicionales del proyecto
