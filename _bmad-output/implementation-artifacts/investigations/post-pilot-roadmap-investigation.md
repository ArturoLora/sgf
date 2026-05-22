# Investigation: SGF Post-Pilot Roadmap

## Hand-off Brief

1. **What happened.** Sistema SGF completó fase piloto (v0.1.0-pilot) con 4 gaps operativos cerrados y 25/25 smoke tests pasando. Esta investigación mapea el estado técnico real del codebase para definir un roadmap incremental post-piloto.
2. **Where the case stands.** Evidencia completamente mapeada. Todos los API routes tienen auth. Un riesgo operativo activo confirmado (silencio en creación de InventoryMovement en ruta de renovación). Tres deudas arquitecturales que bloquean la migración limpia. Dos áreas estables que conviene congelar.
3. **What's needed next.** Revisar y aprobar el roadmap de 3 fases propuesto. El único ítem urgente (silencio en renovación) puede convertirse en bug operativo durante el piloto.

---

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | N/A — investigación estratégica post-piloto |
| Date opened      | 2026-05-21 |
| Status           | Concluded |
| System           | Next.js 16.1.1 + Prisma 6.19.2 + PostgreSQL + better-auth 1.4.12 |
| Evidence sources | docs/PILOT_READY.md, _bmad-output/planning-artifacts/architecture.md, services/, modules/, lib/domain/, app/api/, prisma/schema.prisma, scripts/smoke-test.ts |

---

## Problem Statement

Post-piloto: ¿qué refactors estructurales valen la pena, qué no hay que tocar, qué deuda se convierte en bug, qué hay que congelar, y qué métricas del piloto deben guiar decisiones futuras? El objetivo es un roadmap incremental sin sobreingeniería.

---

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------- | ----- |
| docs/PILOT_READY.md | Available | Cierre formal, gaps, riesgos clasificados, refactor pendiente doc |
| _bmad-output/planning-artifacts/architecture.md | Available | Decisiones D1–D9, algunas resueltas, otras pendientes |
| services/ (7 archivos, 1.604 LOC) | Available | shifts.service.ts (771L), reports.service.ts (293L), users.service.ts (167L), enum-mappers.ts (206L) |
| modules/ (4 módulos migrados + sales sin domain/) | Available | members, products, inventory, sales — todos importan de services/ |
| lib/domain/ (shifts, sales, reports, shared) | Available | shift-calculations.ts limpio y correcto post-Gap 4 |
| app/api/ (26 rutas) | Available | Todas tienen getSession — D8 RESUELTO |
| prisma/schema.prisma | Available | Shift model: sin transferAmount. 11 membership types. |
| scripts/smoke-test.ts | Available | 625 líneas, 25/25 pasando |
| E2E / Playwright | Missing | No existe ningún archivo .spec.ts de browser automation |
| Excel import adapter | Missing | No existe — solo decisión D9 en architecture.md |

---

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Silencio en renovación: app/api/members/renew/route.ts línea 23–70 | High | Done | Bug operativo potencial — ver Finding 1 |
| 2 | Dependencias cruzadas modules/ → services/ | High | Done | Bloquea migración limpia — ver Finding 2 |
| 3 | MEMBERSHIP_KEYWORDS cobertura parcial | Medium | Done | 6/11 tipos cubiertos — ver Finding 3 |
| 4 | Dual Prisma path en services/utils.ts | Medium | Done | legacy import — ver Finding 4 |
| 5 | modules/sales sin domain/ | Medium | Done | D3 no implementado aún |
| 6 | reports.service.ts deudas aceptadas | Low | Done | 3 funciones inline sin domain equiv |
| 7 | shifts.service.ts tamaño y FASE 8E audit | Low | Done | Auditado, no migrable sin prep |

---

## Confirmed Findings

### Finding 1: Orquestación de renovación inline en ruta — fallo silencioso confirmado

**Evidence:** `app/api/members/renew/route.ts:23–70`

**Detail:** La creación del `InventoryMovement` post-renovación está directamente en la ruta API (viola P-2 y P-7). Está envuelta en `try { ... } catch (movErr) { console.error(...) }`. Si falla (producto no encontrado, DB timeout, shift ya cerrado por race condition), la renovación se confirma al usuario pero el movimiento no se crea — la membresía no aparece en el corte. El usuario no recibe error. El gap se descubrirá en el cierre del turno como faltante inexplicable.

**Severidad operativa:** Alta. En operación real, una renovación de $600 MXN que no aparece en el corte genera un faltante de $600 que el cajero no puede explicar.

---

### Finding 2: Todos los modules/ importan utilidades de services/ — dependencia inversa

**Evidence:** 
- `modules/products/products.service.ts:3-8` → `../../services/enum-mappers`, `../../services/utils`, `../../services/membership-helpers`
- `modules/sales/sales.service.ts:3-4` → `../../services/utils`, `../../services/membership-helpers`
- `modules/inventory/inventory.service.ts:3-9` → `../../services/utils`, `../../services/enum-mappers`, `../../services/membership-helpers`
- `modules/members/members.service.ts:8-13` → `../../services/enum-mappers`, `../../services/utils`

**Detail:** Cuatro módulos "migrados" importan desde `services/` — la capa que se supone están reemplazando. Esto hace que `services/enum-mappers.ts` (206L), `services/utils.ts` (99L), y `services/membership-helpers.ts` (60L) sean dependencias compartidas de ambas capas. La migración de `services/shifts.service.ts` → `modules/shifts/` NO resolverá este acoplamiento estructural hasta que estos helpers también se muevan.

---

### Finding 3: MEMBERSHIP_KEYWORDS detecta 6 de 11 tipos de membresía

**Evidence:** `services/membership-helpers.ts:6-12` (MEMBERSHIP_KEYWORDS = 6 valores) vs `services/membership-helpers.ts:25-37` (MEMBERSHIP_TYPE_TO_KEYWORD = 11 tipos Prisma)

**Detail:** Las keywords para detección en cortes son: `["EFECTIVO", "VISITA", "MENSUALIDAD", "SEMANA", "TRIMESTRE", "ANUAL"]`. Los tipos Prisma incluyen también: `PROMOTION → "PROMOCION"`, `REBIRTH → "RENACER"`, `NUTRITION_CONSULTATION → "NUTRICION"`. Si el gimnasio vende una membresía tipo PROMOTION o REBIRTH, el producto asociado no será detectado como membresía en `isMembershipProduct()` → no aparecerá en el resumen del corte como `membershipSales`. Esto es un bug latente activado por configuración de productos, no por código nuevo.

---

### Finding 4: services/utils.ts importa Decimal del legacy Prisma runtime

**Evidence:** `services/utils.ts:1` → `import { Decimal } from "@prisma/client/runtime/library"`

**Detail:** El resto del codebase usa `@/app/generated/prisma` (cliente canónico). `@prisma/client/runtime/library` es el paquete de runtime base de Prisma — funciona ahora pero es un acoplamiento a la ruta de instalación legacy, no al cliente generado. Si se resuelve D2 completamente, este import quedaría colgado.

---

### Finding 5: D8 (endpoint sin auth) ya resuelto — ARCHITECTURE.MD desactualizado

**Evidence:** Grep de todos los archivos `app/api/**/route.ts` — 100% tienen `auth.api.getSession`. `/api/inventory/ticket/[ticket]/route.ts` tiene auth completo.

**Detail:** La architecture.md marca D8 como "Alta urgencia" pero ya está resuelto. No requiere acción.

---

### Finding 6: No existe modules/sales/domain/ — D3 no implementado

**Evidence:** `find modules/sales/ -type f` → solo `sales.service.ts` (281L)

**Detail:** La decisión D3 del architecture doc define crear `modules/sales/domain/` para encapsular lógica de negocio de ventas. Actualmente `sales.service.ts` tiene lógica inline marcada como `DEUDA ACEPTADA`: ordenamiento de tickets, cálculo de totales. Esto es deuda de baja urgencia — el código funciona — pero bloquea testabilidad de la capa de dominio de ventas.

---

### Finding 7: reports.service.ts tiene 3 funciones domain inline no delegadas

**Evidence:** `services/reports.service.ts:55,196,262` — comentarios `DEUDA ACEPTADA (FASE 8D)`

**Detail:** Tres funciones de cálculo en reports (queryLowStockProducts: cálculo inline de bajo stock; getDailySalesReport: agrupación inline; getDashboardSummary: cálculo de comparaciones) no tienen equivalente en `lib/domain/reports/`. Esto no es bug operativo — son cálculos de reporting, no de transacciones. Pero sí bloquea unit testing del servicio.

---

### Finding 8: Shift schema sin transferAmount — migración requerida antes de reactivar TRANSFER

**Evidence:** `prisma/schema.prisma:215-244` — Shift model revisado completo

**Detail:** El schema tiene: cashAmount, debitCardAmount, creditCardAmount, totalVoucher, totalWithdrawals, difference. No hay `transferAmount`. Reactivar TRANSFER como método de pago requiere: (1) migración de schema, (2) actualizar `closeShift` lógica en shifts.service.ts, (3) actualizar el formulario de arqueo, (4) actualizar `calcularDiferencia`. Es una cadena de 4 cambios coordinados — cualquier cambio parcial corrompe el arqueo.

---

## Deduced Conclusions

### Deduction 1: La migración services/ → modules/ está bloqueada por dependencias compartidas

**Based on:** Finding 2 (dependencias inversas)

**Reasoning:** Si muevo `shifts.service.ts` a `modules/shifts/shifts.service.ts` hoy, ese módulo nuevo también necesitará `services/enum-mappers`, `services/utils`, `services/membership-helpers`. La migración no reduce el acoplamiento — solo mueve el problema. El prerequisito real es extraer las utilidades compartidas (`enum-mappers`, `utils`, `membership-helpers`) a una capa neutral (ej: `lib/shared/` o `modules/_shared/`), y luego migrar los servicios.

**Conclusion:** El orden correcto es: (1) extraer shared utilities → (2) migrar shifts/reports/users → (3) limpiar services/.

---

### Deduction 2: El riesgo de Finding 1 (silencio en renovación) es el único riesgo que puede materializarse durante el piloto mismo

**Based on:** Finding 1 (renovación silenciosa), PILOT_READY.md (piloto activo, bajo volumen supervisado)

**Reasoning:** Los otros findings son deuda estructural o latente. Finding 1 puede producir un diferencia inexplicable en el primer corte real si hay cualquier condición de borde (turno aún no abierto cuando el cajero renueva, producto no encontrado por typo en nombre, error transitorio de DB). En piloto supervisado de 1 turno/día con dueño presente, el impacto es detectable — pero el cajero recibirá un confuso "renovación exitosa" + "faltante en caja".

**Conclusion:** Finding 1 debe resolverse en la primera iteración post-piloto, antes de aumentar volumen.

---

### Deduction 3: reports.service.ts y shifts.service.ts son estables para el piloto — no requieren cambios funcionales

**Based on:** Finding 7 (reports deudas son de cálculo, no transacción), shifts.service.ts header (FASE 8E COMPLETADO — auditoría hecha)

**Reasoning:** Los DEUDA ACEPTADA markers en reports.service son cálculos de reporting, no de transacciones. El shifts.service.ts tiene su propio comentario de auditoría FASE 8E confirmando que no hay duplicaciones delegables. Mover estos archivos sin cambio funcional agrega riesgo de regresión sin beneficio observable.

**Conclusion:** Congelar funcionalmente. Mover solo cuando haya un beneficio concreto (ej: añadir transferAmount a Shift).

---

## Hypothesized Paths

### Hypothesis 1: Migrar shifts.service.ts antes de extraer shared utilities causará regresión

**Status:** Open

**Theory:** El archivo tiene 771 líneas, importa de 4 módulos internos, y está auditado (FASE 8E). Un move sin tests automatizados puede introducir un import path roto que no se detecta en build pero falla en runtime.

**Would confirm:** PR de migración de shifts sin prior test coverage → CI falla en algún flujo de corte.

**Would refute:** Tests E2E de corte completo que pasan en la PR.

**Resolution:** Pendiente.

---

### Hypothesis 2: MEMBERSHIP_KEYWORDS con 6/11 tipos es bug latente pero no activo en el piloto

**Status:** Open

**Theory:** Los 3 tipos faltantes (PROMOTION, REBIRTH, NUTRITION_CONSULTATION) probablemente no tienen productos activos en el gimnasio del piloto. Si no hay producto "PROMOCION" activo, no hay movimiento que perder.

**Would confirm:** Revisar seed data + productos activos en DB del piloto.

**Would refute:** Producto "PROMOCION" o "RENACER" encontrado activo con ventas registradas que no aparecen en corte.

**Resolution:** Pendiente — verificar con datos reales del piloto.

---

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Datos reales del piloto (shifts, membresías vendidas, diferencias) | Confirmaría Hypothesis 2 y calibraría umbrales de alarma | Primeras 2 semanas de operación real |
| ¿Tiene el gimnasio productos PROMOCION/RENACER/NUTRICION activos? | Confirma si Finding 3 es bug activo o latente | SELECT name FROM Product WHERE active=true |
| Frecuencia real de renovaciones/turno | Calibra urgencia de Finding 1 | Datos de piloto semana 1 |

---

## Source Code Trace

| Element | Detail |
| ------- | ------- |
| Bug operativo (Finding 1) | `app/api/members/renew/route.ts:23-70` |
| Dependencias cruzadas | `modules/*/modules.service.ts:1-15` (todos), `services/enum-mappers.ts`, `services/utils.ts`, `services/membership-helpers.ts` |
| Keyword coverage gap | `services/membership-helpers.ts:6-12` vs `services/membership-helpers.ts:25-37` |
| Shift schema | `prisma/schema.prisma:215-244` |
| Domain puro estable | `lib/domain/shifts/shift-calculations.ts` |
| Smoke test baseline | `scripts/smoke-test.ts` (625L, 25/25) |

---

## DIAGNÓSTICO POST-PILOTO

### Estado real vs. estado percibido

| Área | Estado percibido | Estado real |
| ---- | ---------------- | ----------- |
| Auth en APIs | ⚠️ D8 pendiente según architecture.md | ✅ 100% rutas tienen getSession — resuelto |
| Migración modules/ | modules/ migrado excepto shifts/reports/users | modules/ "migrados" DEPENDEN de services/ — migración incompleta semánticamente |
| Renovación en corte | ✅ Gap 2 cerrado — membresías visibles | ⚠️ InventoryMovement creation puede fallar silenciosamente |
| MEMBERSHIP coverage | ✅ 6 tipos detectados | ⚠️ 11 tipos en Prisma — 5 sin coverage si existen como productos |
| E2E tests | Smoke test 25/25 | Solo nivel API — cero browser automation |
| Reporte de ventas | UI /reports existe | Solo muestra stock — no ventas por período |

---

## RIESGOS POR PRIORIDAD

### 🔴 RIESGO 1 — Bug operativo activo (puede materializarse en piloto)
**Silencio en creación de InventoryMovement al renovar membresía**
- Archivo: `app/api/members/renew/route.ts:23–70`
- Condición: cualquier error en el bloque try/catch secundario → faltante inexplicable en corte
- Impacto: $$$ faltante en caja que el cajero no puede explicar
- Dificultad de fix: Baja (mover lógica a orchestrator, hacer el error blocking no silencioso)
- Criterio urgencia: Alto. Puede ocurrir en el primer turno real.

### 🟡 RIESGO 2 — Keyword coverage parcial (bug latente, activado por datos)
**MEMBERSHIP_KEYWORDS detecta 6 de 11 tipos Prisma**
- Archivo: `services/membership-helpers.ts:6-12`
- Condición: gimnasio tiene producto "PROMOCION" o "RENACER" activo y lo vende
- Impacto: membresía vendida no aparece en corte como membershipSales
- Dificultad de fix: Baja (ampliar array de 6 a 9 keywords, o centralizar con MEMBERSHIP_TYPE_TO_KEYWORD)
- Criterio urgencia: Verificar con datos reales del piloto semana 1.

### 🟡 RIESGO 3 — TRANSFER reactivación parcial = corrupción de arqueo
**Cadena de 4 cambios necesarios coordinados**
- Archivos: schema.prisma, shifts.service.ts, shift-calculations.ts, UI arqueo
- Condición: alguien activa TRANSFER en una rama sin completar los 4 cambios
- Impacto: transferencias caen en creditCardAmount → diferencia incorrecta
- Dificultad de fix: Media (4 cambios coordinados, requiere migración de DB)
- Criterio urgencia: No tocar hasta que sea funcionalidad explícitamente pedida.

### 🔵 RIESGO 4 — Deuda estructural (no opera, bloquea evolución)
**modules/ depende de services/ — migración bloqueada**
- El código funciona. El riesgo es que futuros devs asuman que modules/ es independiente.
- No es bug — es deuda de arquitectura.

### 🔵 RIESGO 5 — shifts.service.ts monolítico sin tests
**771 líneas, core del negocio, cero cobertura automatizada**
- Riesgo se materializa cuando se modifica (TRANSFER, migración estructural)
- Mitigación actual: smoke test cubre flujos de shifts a nivel API

---

## ROADMAP INCREMENTAL POST-PILOTO

---

### ⚡ FASE POST-PILOT A — Hardening & Shared Utilities
**Timing:** Inmediata — ejecutar durante o justo después del piloto (v0.1.x)
**Objetivo:** Eliminar el único bug operativo activo y preparar la base para migración limpia

#### A1 — Hardening de renovación (Finding 1)
**Cambios:**
- Extraer lógica de InventoryMovement creation de `app/api/members/renew/route.ts` a `lib/orchestrators/renewal.orchestrator.ts`
- Hacer el fallo de creación de movimiento BLOCKING (no silencioso): si falla la creación del InventoryMovement, la transacción de renovación hace rollback o retorna error 500
- Alternativamente: hacer la renovación transaccional (Prisma `$transaction`) para que ambas operaciones sean atómicas

**¿Vale la pena?** Sí. Es el único cambio con impacto directo en operación del piloto.  
**¿Sobreingeniería?** No. Es exactamente el nivel correcto: el orchestrator existe, solo hay que crearlo.  
**Impacto:** Alto. Elimina diferencias inexplicables en corte.  
**Dificultad:** Baja (1-2 archivos, lógica ya existe).  
**Riesgo:** Bajo (la lógica ya está en la ruta — solo se mueve).

#### A2 — Extraer shared utilities a lib/shared/ (Finding 2)
**Cambios:**
- Crear `lib/shared/` con: `enum-mappers.ts`, `utils.ts`, `membership-helpers.ts`
- Actualizar imports en todos los módulos: de `../../services/*` a `@/lib/shared/*`
- Dejar `services/*.ts` como re-exportadores temporales (backward compat)

**¿Vale la pena?** Sí. Prerrequisito para Fase B. Sin esto, la migración de shifts/reports es cosmética.  
**¿Sobreingeniería?** No. Es un refactor mecánico, sin lógica nueva.  
**Impacto:** Medio (no visible para usuario, sí para arquitectura).  
**Dificultad:** Baja (rename + repoint imports, grep-verificable).  
**Riesgo:** Bajo (cambio de rutas de import, build falla si algo falta).

#### A3 — Ampliar MEMBERSHIP_KEYWORDS a todos los tipos (Finding 3)
**Cambios:**
- Verificar primero con datos del piloto si tipos PROMOTION/REBIRTH/NUTRITION están en uso
- Si sí: ampliar MEMBERSHIP_KEYWORDS para cubrir los 11 tipos (o derivar de MEMBERSHIP_TYPE_TO_KEYWORD)
- Centralizar en `lib/shared/membership-helpers.ts` (aprovechando A2)

**¿Vale la pena?** Sí si los tipos existen. No si el gimnasio no los usa.  
**¿Sobreingeniería?** No — es una línea de código si ya se tiene A2.  
**Criterio de go/no-go:** Datos del piloto semana 1.

---

### 🔧 FASE POST-PILOT B — Migración Estructural (services/ → modules/)
**Timing:** Post-piloto estabilizado, piloto con >2 semanas operando bien (v0.2)
**Prerequisito:** Fase A completada (shared utilities extraídas)
**Objetivo:** Completar la migración de capa de servicios a arquitectura modular canónica

#### B1 — modules/shifts/shifts.service.ts
**Cambios:**
- Mover `services/shifts.service.ts` (771L) → `modules/shifts/shifts.service.ts`
- Actualizar `services/index.ts` para re-exportar desde nueva ubicación
- Añadir `transferAmount` a Shift schema (migración) y actualizar fórmula de difference
- Reactivar TRANSFER en UI (POS + renovación modal)
- Crear `modules/shifts/domain/` con funciones puras extraídas del service

**¿Vale la pena?** Sí — pero solo después de Fase A y cuando se añada TRANSFER (que tiene ROI funcional claro).  
**¿Sobreingeniería?** Mover por mover = sobreingeniería. Mover mientras se añade TRANSFER = correcto.  
**Impacto:** Alto funcional (TRANSFER) + Medio estructural.  
**Dificultad:** Alta (771L + migración de schema + UI).  
**Riesgo:** Medio. Smoke tests deben pasar antes de merge.

#### B2 — modules/reports/reports.service.ts
**Cambios:**
- Mover `services/reports.service.ts` (293L) → `modules/reports/reports.service.ts`
- Resolver las 3 deudas FASE 8D: extraer funciones a `modules/reports/domain/`
- Expandir UI de /reports para mostrar ventas por período (ReportesManager)

**¿Vale la pena?** Sí — combinado con expansión funcional de reportes que el dueño pedirá post-piloto.  
**¿Sobreingeniería?** Mover sin expandir reportes = sobreingeniería pura. Mover mientras se añaden reportes útiles = correcto.  
**Criterio de go/no-go:** ¿El dueño pide reportes de ventas por período después del piloto? Si sí, ir. Si no, diferir.  
**Dificultad:** Media.

#### B3 — modules/users/users.service.ts
**Cambios:**
- Mover `services/users.service.ts` (167L) → `modules/users/users.service.ts`

**¿Vale la pena?** Bajo. Users es el servicio más simple y menos tocado.  
**¿Sobreingeniería?** Podría ser — el archivo funciona, es pequeño, y raramente cambia.  
**Criterio:** Moverlo solo si se hace B1 y B2 en la misma iteración (consistencia > aislamiento).

#### B4 — modules/sales/domain/
**Cambios:**
- Crear `modules/sales/domain/` con funciones extraídas de sales.service.ts (ordenamiento, cálculos)
- D3 del architecture doc

**¿Vale la pena?** Solo si se añaden features de ventas (filtros avanzados, reportes por ticket).  
**¿Sobreingeniería?** Sí si no hay feature nueva que lo justifique.

---

### 🧪 FASE POST-PILOT C — Quality Layer
**Timing:** v0.3 — cuando el sistema esté maduro y se amplíe el equipo
**Objetivo:** Testabilidad, robustez para escalar equipo/volumen, funciones operativas avanzadas

#### C1 — E2E con Playwright
**Cambios:**
- Playwright tests para: login→open shift→POS sale→close shift
- Playwright test para: login→renovar membresía→verificar en corte

**¿Vale la pena?** Sí — cuando Fase B esté completa y los refactors sean frecuentes.  
**¿Sobreingeniería?** Sí antes de Fase B. La estructura cambia demasiado en B para amortizar los tests.  
**Criterio:** Post-Fase B, antes de ampliar el equipo.

#### C2 — Unit tests de domain functions
**Cambios:**
- Vitest tests para: lib/domain/shifts/shift-calculations.ts, modules/*/domain/*
- Prioridad: shift-calculations primero (ya puro, ya correcto)

**¿Vale la pena?** Sí — previene regresiones en las fórmulas más críticas.  
**¿Sobreingeniería?** No si el scope es domain functions solamente (no services).

#### C3 — Excel import adapter
**Cambios:**
- `lib/orchestrators/` o `lib/adapters/` con ImportAdapter interface
- Adapters: miembros desde Excel, productos desde Excel
- UI de importación

**¿Vale la pena?** Cuando el gimnasio tenga datos históricos que quiera migrar o carga masiva.  
**¿Sobreingeniería?** Sí si no hay caso de uso concreto solicitado.  
**Criterio de go/no-go:** El dueño lo pide explícitamente. No implementar proactivamente.

---

## ÁREAS A CONGELAR

Las siguientes áreas son estables, correctas, y el riesgo de tocarlas supera el beneficio:

| Área | Motivo para congelar |
| ---- | -------------------- |
| `lib/domain/shifts/shift-calculations.ts` | Puro, correcto post-Gap 4, testeado por smoke. Tocar = riesgo directo al arqueo. |
| `scripts/smoke-test.ts` | 625L, 25/25 pasando. Ampliar, nunca destruir. |
| `types/api/` | Contratos Zod estables. Cambiar solo si se añade endpoint nuevo. |
| `prisma/schema.prisma` | Solo extender (additive). Nunca renombrar columnas usadas en producción. |
| `modules/members/` | Completamente migrado, correcto, FASE 3 comments son intencionales. |
| `lib/domain/shared/pagination.ts` | Usado por 3+ módulos, estable. |
| MEMBERSHIP_KEYWORDS (los 6 actuales) | No quitar — solo añadir si necesario. |

---

## MÉTRICAS REALES DEL PILOTO QUE DEBEN GUIAR DECISIONES

| Métrica | Qué informa | Umbral de decisión |
| ------- | ----------- | ----------------- |
| `Shift.difference` promedio y desviación | Precisión del arqueo. Si hay diferencias sistemáticas, hay bug no detectado. | Si > 2 diferencias > $100 en 2 semanas → investigar Finding 1 urgente |
| Frecuencia de renovaciones / turno | ROI de hardening A1. | Si > 3 renovaciones/turno → A1 es urgente |
| Tipos de membresía vendidos | Confirma cobertura de MEMBERSHIP_KEYWORDS. | Si aparece tipo PROMOTION/REBIRTH en ventas → A3 urgente |
| Errores HTTP 500 en logs | Cualquier bug no detectado. | > 0 en operación normal = investigar |
| Solicitudes del dueño de nueva funcionalidad | Guía prioridad de Fase B/C. | "Quiero ver ventas por período" → B2 sube prioridad |
| ¿El dueño revisa el corte independientemente? | Validación de UX del arqueo. | Si el dueño no entiende la diferencia → UX review antes de B |

---

## Conclusion

**Confidence:** High

**Resumen:** El sistema está production-ready para piloto de bajo volumen. Todos los API routes tienen auth. Los 4 gaps operativos están cerrados. Smoke tests 25/25 pasando.

Hay **un bug operativo activo** (Finding 1 — silencio en renovación) que puede generar diferencias inexplicables en el corte durante el piloto. Es el único ítem urgente.

La "migración services/ → modules/" está **semánticamente incompleta**: todos los módulos "migrados" importan utilities de services/. El prerequisito real (extraer shared utilities) es trabajo de Fase A.

shifts.service.ts (771L) es estable y auditado — NO migrar hasta que haya un trigger funcional concreto (TRANSFER).

El roadmap correcto es A (hardening) → B (migración con trigger funcional) → C (quality), no al revés.

## Recommended Next Steps

### Fix direction (Finding 1 — urgente)
Crear `lib/orchestrators/renewal.orchestrator.ts` que encapsule la lógica de renovación + creación de InventoryMovement de forma atómica. La ruta `/api/members/renew/route.ts` queda reducida a: parse input → call orchestrator → return response.

### Diagnostic post-piloto (semana 1)
- Revisar `Shift.difference` de los primeros turnos
- Query: `SELECT name FROM Product WHERE active=true AND (name ILIKE '%PROMO%' OR name ILIKE '%RENACER%' OR name ILIKE '%NUTRICION%')`

## Side Findings

- `services/index.ts` exporta `MembersService` apuntando a `@/modules/members/domain` (el subfolder domain, no members.service.ts) — puede ser intencional o typo. Merece verificación. `services/index.ts:2` → `export * as MembersService from "@/modules/members/domain"`.
- La UI de /reports actualmente muestra solo stock ("Stock actual del inventario") según el texto en `reports/page.tsx:11`. El ReportesManager no muestra ventas por período — D7 no implementado en UI aún.
- `lib/db.ts` importa de `@/app/generated/prisma` y `lib/auth.ts` importa de `@/app/generated/prisma/client` — técnicamente dos rutas distintas al mismo cliente generado. El note de D2 en architecture.md explica que `client` subpath es el PrismaClient class específicamente. No es doble instancia, pero es confuso. Aclarar con comentario.
