# Story 2.3: Validación Post-Reconstrucción y Reporte Final

Status: review

## Story

As an administrador de SGF,
I want que el sistema verifique automáticamente que la reconstrucción quedó completa y correcta, y genere un reporte auditable,
So that tenga evidencia documentada de que la base reconstruida coincide con los datos históricos originales.

## Alcance

**Incluido:** validaciones de solo lectura ejecutadas después de que `executeReconstruction()` (Story 2.2) ya terminó, reporte final para el admin, y exportación del reporte. Esta historia **cierra definitivamente la Epic 2**.

**No incluido:** ningún cambio a `deleteOperationalData()`, `resetProducts()`, `executeReconstruction()`, ni a `syncMembers()`/`syncShifts()`/`finalizeSyncMode()` de Epic 1. Esta historia es puramente diagnóstica — corre **después** de que los datos ya se escribieron; ninguna validación aquí puede revertir, bloquear, ni modificar lo que Story 2.2 ya hizo.

**Mandato de reutilización:** el resultado de `executeReconstruction()` (Story 2.2) ya trae la mayoría de lo necesario — `membersResult`, `shiftsResult`, `productResult`, y críticamente `finalizeResult.consistencyWarnings`, que **ya es** la validación financiera por turno que pide esta historia (ver H1). No se reimplementa.

## Hallazgos de análisis (documentados, no resueltos aquí)

Verificados contra epics.md, el schema real, y el código de Epic 1/2.1/2.2 ya aprobado — no hipótesis.

| # | Hallazgo | Evidencia | Restricción que impone sobre esta historia |
|---|----------|-----------|---------------------------------------------|
| H1 | El AC de epics.md pide verificar "SUM(InventoryMovement.total WHERE type=SALE) ≈ Shift.totalSales, tolerancia ±0.01". **Esa validación ya existe** — es exactamente `compareShiftTotals()` (`modules/migration/domain/sync-finalize.ts`, Story 1.6), que corre automáticamente dentro de `finalizeSyncMode()`, ya invocado sin cambios por `executeReconstruction()` (Story 2.2). La única diferencia es la tolerancia: Story 1.6 usa `$1.00`, epics.md pide `±0.01`. | `modules/migration/domain/sync-finalize.ts` — `TOTALS_TOLERANCE = 1` | Esta historia **reutiliza** `finalizeResult.consistencyWarnings` tal cual — no reimplementa la suma/comparación. La tolerancia de `$1.00` (ya aprobada en Story 1.6) se mantiene; cambiarla requeriría tocar Story 1.6, fuera del alcance explícito de esta historia ("no modificar el motor de reconstrucción/sincronización"). El AC de esta historia se adapta a la tolerancia real ya implementada, no a los `±0.01` literales de epics.md. |
| H2 | El AC de "verificación de FK orphans" (memberId/shiftId/cashierId huérfanos) describe un escenario **estructuralmente imposible** en este schema: no hay `relationMode` configurado en `prisma.config.ts`/`schema.prisma`, por lo que Prisma usa FKs reales de Postgres (no emuladas). Una fila con un FK apuntando a un registro inexistente **no puede insertarse** — Postgres la rechaza en el momento del INSERT, mucho antes de que esta historia pudiera "detectarla" después. | `prisma.config.ts`, `prisma/schema.prisma` — sin `relationMode`, conector `postgresql` | La verificación de orphans se implementa igual (es barata y da evidencia auditable: "0 huérfanos confirmados"), pero **no se diseña como una validación que razonablemente pueda fallar** en operación normal. Si alguna vez detecta un huérfano, eso indica una corrupción de datos mucho más grave que un problema normal de reconstrucción (posible manipulación directa de la DB fuera de Prisma) — debe tratarse como alerta crítica separada, no como una advertencia amarilla más. |
| H3 | El conteo "COUNT(member) == N socios en el archivo" **no puede derivarse solo de `membersResult.created + membersResult.updated`** que ya devuelve Story 2.2 — si dos filas del xlsx comparten el mismo `memberNumber` (caso real ya visto en Story 1.4/1.5 con tickets duplicados), `syncMembers()` correctamente cuenta 1 `created` + 1 `updated` (2 en total, coincidiendo con N=2 filas de entrada), pero la tabla `Member` termina con **1 sola fila real**. Comparar contra `created+updated` ocultaría exactamente el caso que esta validación debería exponer. | Comportamiento de `syncMembers()` (Story 1.4, fix de duplicados commit `2a42f20`) | Esta historia **debe** ejecutar un `COUNT` fresco contra la base (`prisma.member.count()`, `prisma.shift.count()`) y compararlo contra `N` (el tamaño de los arreglos `DomainMember[]`/`DomainShift[]` ya conocido desde el preview) — no puede ser aritmética pura sobre el resultado de Story 2.2. |
| H4 | epics.md no distingue explícitamente un estado "rojo" (fallo) de uno "ámbar" (advertencia) — solo describe verde (todo bien) y ámbar (discrepancia financiera). Pero un **desajuste de conteos** (H3) es cualitativamente más grave que una diferencia de centavos en un turno y merece su propio nivel. | Lectura literal de las ACs de epics.md — solo 2 estados descritos | Esta historia define 3 niveles: **verde** ("Reconstrucción válida" — todo coincide), **ámbar** ("con advertencias" — discrepancias financieras por turno dentro de lo ya tolerado por Story 1.6, o advertencias de campos legacy ya generadas), **rojo** ("con inconsistencias" — desajuste de conteos de socios/cortes, o cualquier huérfano de FK detectado, ver H2). Ninguno de los tres estados revierte ni modifica datos — son puramente informativos (ver Alcance). |
| H5 | "Qué información debe quedar registrada para auditoría" (petición explícita del usuario) — no existe ningún modelo en el schema para persistir un historial de reconstrucciones (no hay tabla `ReconstructionLog` ni equivalente), y crear uno sería un cambio de schema fuera del alcance declarado ("no nuevas reglas de negocio"). | `prisma/schema.prisma` — sin modelo de auditoría de migración | El "registro para auditoría" de esta historia se satisface con la exportación manual del reporte (AC "Exportar Reporte" de epics.md — texto/PDF descargado por el admin en el momento), **no** con persistencia server-side ni con una pantalla de historial consultable después. Si se requiere auditoría persistente y consultable, es una historia nueva fuera de este alcance. |

## Acceptance Criteria

### Validaciones obligatorias (bloquean el estado "verde", nunca bloquean ni revierten datos)

1. **Given** `executeReconstruction()` (Story 2.2) terminó con `success: true`,
   **When** corre la validación post-reconstrucción,
   **Then** se compara `COUNT(Member)` real contra `N` (tamaño de `DomainMember[]` del preview) y `COUNT(Shift)` real contra `M` (tamaño de `DomainShift[]` del preview) — ver H3.

2. **Given** la validación de conteos corre,
   **When** `COUNT(Member) !== N` o `COUNT(Shift) !== M`,
   **Then** el reporte muestra el badge rojo "Reconstrucción con inconsistencias" (ver H4) y detalla la diferencia exacta (ej. "Se esperaban 652 socios, se encontraron 651 — posible memberNumber duplicado en el archivo").

3. **Given** la validación corre,
   **When** se ejecuta la verificación de integridad referencial,
   **Then** se confirma ausencia de huérfanos: `InventoryMovement.memberId`/`InventoryMovement.shiftId` apuntando a registros inexistentes, `Shift.cashierId` apuntando a un `User` inexistente — ver H2 (se espera que esto siempre pase; si no pasa, es una alerta crítica, no una advertencia más).

4. **Given** todas las validaciones de conteos e integridad referencial pasan,
   **When** además `finalizeResult.consistencyWarnings` (Story 1.6, reutilizado sin cambios — ver H1) está vacío,
   **Then** el reporte muestra el badge verde "Reconstrucción válida".

### Advertencias (no bloquean el estado, se listan explícitamente)

5. **Given** los conteos e integridad referencial son correctos pero `finalizeResult.consistencyWarnings` tiene entradas,
   **When** se genera el reporte,
   **Then** se muestra el badge ámbar "Reconstrucción con advertencias" y se listan las discrepancias financieras por turno exactamente como las produce `compareShiftTotals()` (Story 1.6) — sin reformatear el mensaje al formato literal de epics.md (ver H1).

6. **Given** hubo advertencias de campos legacy sin equivalente (`syncShiftsResult.warnings`, Story 1.5) o de reimportación de productos,
   **When** se genera el reporte,
   **Then** se incluyen también en la sección de advertencias del reporte final.

### Reporte final

7. **Given** la reconstrucción y su validación terminaron,
   **When** se muestra el reporte,
   **Then** incluye como mínimo: fecha/hora de la reconstrucción; conteos por entidad (socios, cortes, movimientos desglosados por tipo, retiros, productos reimportados si aplica); resultado de cada validación (pass/fail) con su badge; todas las advertencias y errores con su fuente (folio/nombre) ya disponibles en los resultados de Story 2.2.

8. **Given** el admin ve el reporte final,
   **When** hace clic en "Exportar Reporte",
   **Then** se genera un resumen imprimible (texto o PDF) con el mismo contenido del reporte en pantalla — ver H5 sobre el alcance de "auditoría" en esta historia.

### Cierre del flujo

9. **Given** el admin exportó o revisó el reporte,
   **When** decide cerrar,
   **Then** el wizard de Reconstrucción se resetea completamente al estado inicial (mismo patrón que el cierre de Sync mode).

### Integridad arquitectónica

10. **Given** cualquier parte de esta historia ejecuta,
    **When** corre el código,
    **Then** son exclusivamente lecturas (`count`, `findMany` de solo lectura) contra Prisma y lectura de los resultados ya devueltos por `executeReconstruction()` — cero escrituras, cero modificaciones a `reconstruction.service.ts` más allá de, si es estrictamente necesario, exponer un campo de timestamp ya calculado (no lógica nueva de negocio).

## Tasks / Subtasks (nivel arquitecto — el diseño detallado se define en dev-story)

- [x] Task 1: Función de validación de solo lectura (conteos + orphans) en `reconstruction.service.ts` o archivo hermano — AC: 1, 2, 3
- [x] Task 2: Lógica de clasificación de severidad (verde/ámbar/rojo) reutilizando `finalizeResult.consistencyWarnings` y los resultados ya existentes de Story 2.2, sin recalcular nada que ya exista (H1) — AC: 4, 5, 6
- [x] Task 3: Componente de reporte final del flujo de Reconstrucción (badge + secciones) — AC: 7
- [x] Task 4: Exportación a texto/PDF imprimible — AC: 8
- [x] Task 5: Cierre del wizard reutilizando el patrón existente — AC: 9
- [x] Task 6: Endpoint(s) API de solo lectura, ADMIN-only, para las validaciones que requieren consulta fresca a la DB (conteos, orphans) — AC: 10
- [x] Task 7: Smoke tests de cualquier función pura nueva (clasificación de severidad) — sin diseñar aquí el detalle de casos

## Dev Notes

### Consistencia con Epic 1/2.1/2.2

- Ningún archivo de `modules/migration/domain/transformers/`, `modules/migration/adapters/`, ni las funciones `syncMembers`/`syncShifts`/`finalizeSyncMode`/`deleteOperationalData`/`resetProducts`/`executeReconstruction` se modifican en esta historia — solo se leen sus resultados ya producidos.
- El componente de reporte de esta historia es conceptualmente equivalente a `FinalReportStep.tsx` (Story 1.6, modo Sincronización) pero para el flujo de Reconstrucción — mismo espíritu, sin compartir código forzosamente si las estructuras de datos difieren (`ReconstructionExecutionResult` vs `SyncShiftsResponseType`).
- `ExecutionStep.tsx` (Story 2.2) actualmente muestra un resumen mínimo al finalizar — esta historia lo reemplaza o extiende con el reporte completo de validación.

### Project Structure Notes

- Archivos a extender: `modules/migration/reconstruction.service.ts` (función de validación, posible campo de timestamp), `types/api/migracion.ts`, `app/(dashboard)/configuracion/migracion/_components/ExecutionStep.tsx` o un nuevo componente de reporte.
- Archivo(s) nuevo(s) esperado(s): endpoint de validación bajo `app/api/migracion/reconstruccion/`, componente de reporte final.
- Sin conflictos con la estructura unificada del proyecto.

### Testing standards summary

- Smoke tests (`tsx`, sin DB) para la función pura de clasificación de severidad.
- La validación de conteos/orphans toca DB — requiere verificación manual contra una base real, mismo patrón que todas las historias de Epic 1/2.1/2.2. En particular, probar el caso de H3 (memberNumber duplicado en el archivo) para confirmar que el badge rojo aparece correctamente cuando `COUNT(Member) < N`.
- `npx tsc --noEmit` y `npm run lint` limpios; regresión: toda la suite `smoke:*` existente (173 casos) debe seguir pasando sin tocar ningún archivo de Epic 1/2.1/2.2 más allá de lo explícitamente permitido en AC10.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-23-validación-post-reconstrucción-y-reporte-final]
- [Source: _bmad-output/planning-artifacts/epics.md — FR19, FR20]
- [Source: modules/migration/domain/sync-finalize.ts#compareShiftTotals — validación financiera ya existente, reutilizada (H1)]
- [Source: _bmad-output/implementation-artifacts/2-2-ejecucion-reconstruccion-completa.md — ReconstructionExecutionResult, executeReconstruction()]
- [Source: prisma.config.ts, prisma/schema.prisma — FKs reales de Postgres, sin relationMode (H2)]
- [Source: _bmad-output/implementation-artifacts/1-4-importacion-sincronizada-socios.md — fix de memberNumber duplicado, commit `2a42f20` (H3)]

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- H2 verificado empíricamente, no solo por lectura del schema: las 3 consultas de anti-join (huérfanos de `memberId`, `shiftId` en `InventoryMovement`, `cashierId` en `Shift`) se ejecutaron contra la DB real y devolvieron `0` — confirmando que las FK reales de Postgres efectivamente impiden que existan huérfanos, tal como predijo el hallazgo.
- Verificado con datos reales (652 socios, 1 corte de la reconstrucción de Story 2.2): `validateReconstruction(652, 1, 0)` → `severity: "green"`. Forzando un `expectedMembers` incorrecto (653) → `severity: "red"`, `memberCountMatches: false`. Forzando `consistencyWarningCount: 2` → `severity: "amber"`. Los 3 niveles de H4 confirmados con ejecución real, no solo con el smoke test de la función pura.
- TS no logra angostar (narrow) el tipo de `validation` (state de React) dentro de una `function` declarada más abajo en el mismo componente, pese a un `if (!validation) return` previo — limitación conocida de TypeScript con clausuras. Resuelto con una aserción no-nula explícita y comentada en `handleExport()`, no con un cambio de lógica.

### Completion Notes List

- Los 10 AC se cumplen. `validateReconstruction()` es de solo lectura — cero escrituras, verificado leyendo el código (`count()`, `$queryRaw` con `SELECT`) y confirmado en la ejecución real (conteos en DB sin cambios antes/después de correrla varias veces).
- H1 aplicado: no se reimplementó la comparación financiera por turno — `ValidationReportStep` consume directamente `result.finalizeResult.consistencyWarnings` (Story 1.6, sin tocar) para la sección de advertencias financieras.
- H3 aplicado: `validateReconstruction()` ejecuta `prisma.member.count()`/`prisma.shift.count()` frescos — no deriva del resultado de `syncMembers()`/`syncShifts()`, evitando el falso-positivo de conteo que un `memberNumber` duplicado produciría.
- H5 aplicado: "Exportar Reporte" genera un archivo de texto plano descargado por el navegador (`Blob` + enlace temporal) — sin nueva dependencia de PDF, sin persistencia server-side.
- `ExecutionStep.tsx` delega su rama de éxito completa a `ValidationReportStep.tsx` — el resumen mínimo que tenía antes (Story 2.2) queda reemplazado por el reporte completo de esta historia, tal como anticipaban las Dev Notes.
- AD-1 intacto: `reconstruction-report.ts` es puro (sin Prisma); `reconstruction.service.ts` solo agrega una función nueva de solo lectura, sin tocar `deleteOperationalData()`/`resetProducts()`/`executeReconstruction()`; cero cambios en Epic 1 (`migration.service.ts`, adapters, transformers) confirmado con `git diff --stat`.

### File List

**Nuevos:**
- `modules/migration/domain/reconstruction-report.ts`
- `app/api/migracion/reconstruccion/validar/route.ts`
- `app/(dashboard)/configuracion/migracion/_components/ValidationReportStep.tsx`
- `scripts/reconstruction-report-smoke-test.ts`

**Modificados:**
- `modules/migration/reconstruction.service.ts` — `validateReconstruction()`
- `types/api/migracion.ts` — schemas de Story 2.3
- `app/(dashboard)/configuracion/migracion/_components/ExecutionStep.tsx` — delega el caso de éxito a `ValidationReportStep`
- `app/(dashboard)/configuracion/migracion/_components/ReconstructionManager.tsx` — pasa `expectedMembers`/`expectedShifts` desde `previewResult`
- `package.json` — script `smoke:reconstruction-report`
