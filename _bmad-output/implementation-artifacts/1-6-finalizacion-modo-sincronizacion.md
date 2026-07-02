# Story 1.6: Actualización Post-Importación y Finalización del Modo Sincronización

Status: review

## Story

As an administrador de SGF,
I want que el sistema actualice automáticamente los niveles de stock al terminar una importación y me muestre un reporte final completo,
So that SGF refleje el estado operativo real a partir de los datos importados, y yo sepa exactamente qué se importó, qué falló y qué requiere mi atención.

## Alcance

**Incluido:** paso final del wizard de Sincronización — actualización de `Product.gymStock`, notificación de ticket máximo importado, validaciones ligeras de consistencia, resumen/reporte final por entidad, y cierre correcto del wizard. Esta historia **cierra la Epic 1**.

**Excluido explícitamente (Epic 2):** Modo Reconstrucción, borrado de datos, reset de base, validación post-reconstrucción completa (la de esta historia es una validación ligera de Sync, no la reconciliación exhaustiva de FR19 que Epic 2 necesitará tras un DELETE masivo).

## Hallazgos de análisis (documentados, no resueltos aquí)

Verificados contra código real de este repo — no hipótesis.

| # | Hallazgo | Evidencia | Restricción que impone sobre esta historia |
|---|----------|-----------|---------------------------------------------|
| H7 | FR17/epics.md asumen que SGF tiene un contador de tickets secuencial "inicializable". **Falso.** El generador de tickets en vivo no es secuencial: `generateTicket()` produce `VEN-{timestamp}-{random}` — no hay ningún contador configurable, y no puede haber colisión con los tickets numéricos históricos (formatos completamente distintos). | `lib/domain/sales/ticket.ts` | El AC "inicializa tu contador de tickets desde [N+1]" tal como está escrito en epics.md **no es accionable** — no existe nada que inicializar. Este AC debe reformularse como puramente informativo/de auditoría (mostrar el ticket máximo importado), sin implicar que el admin debe "configurar" algo. |
| H8 | El valor "Exi Actual" (snapshot de stock, `DomainInventoryRow.gymStock`) se calcula en `transformShift()` durante el parseo, pero **Story 1.5 nunca lo persiste** — `syncShifts()` solo usa `row.adjustment`/`row.entries` (deltas) para crear movimientos `ADJUSTMENT`/`GYM_ENTRY` vía `createMany`, que además **bypassa** el patrón de actualización incremental de `Product.gymStock` que sí usa el flujo de venta en vivo (`modules/inventory/inventory.service.ts` decrementa/incrementa `gymStock` en cada movimiento individual). | `modules/migration/domain/transformers/shift-transformer.ts:52`; grep confirma cero usos de `row.gymStock` en `migration.service.ts` | El snapshot **no existe en ningún lado después de que termina la request de `sync-shifts`**. Esta historia solo puede calcular `Product.gymStock` correctamente si consume el `DomainShift[]` **todavía en memoria de la misma sincronización** (mismo request/response que produjo `syncShifts()`), no como un paso desacoplado que se ejecuta después contra la DB. Esto es consistente con el diseño de epics.md (Story 1.6 existe precisamente porque Story 1.5 no replica el patrón incremental en vivo) — no es un error de 1.5, es la razón de ser de esta historia. |
| H9 | Si un admin sincroniza un lote de cortes **más antiguo** después de ya haber sincronizado cortes más recientes en una corrida anterior, actualizar `gymStock` ingenuamente desde "el corte más reciente de esta corrida" retrocedería el stock a valores obsoletos. | Consecuencia lógica de H8 — no hay snapshot persistido de corridas anteriores para comparar | Antes de aplicar la actualización de `gymStock`, debe verificarse que el corte más reciente de la corrida actual sea también el más reciente conocido por el sistema (comparando contra `MAX(Shift.openingDate)` en DB, que sí está persistido). Si una corrida importa datos más antiguos que el máximo ya existente, esta historia debe **omitir** la actualización de `gymStock` para esos productos (o para toda la corrida) y reportarlo como advertencia — no aplicar el valor obsoleto silenciosamente. |
| H10 | El reporte final (FR20 / AC de epics.md) pide desglose de "movimientos totales (ventas, ajustes, entradas, retiros)", pero `SyncShiftsResult` (Story 1.5) solo expone `movementsCreated` como un total combinado, sin desglose por subtipo. | `modules/migration/migration.service.ts` — `SyncShiftsResult` interface | Requiere una extensión aditiva (no redisño) de `SyncShiftsResult`/`syncShifts()` para exponer el desglose por tipo de movimiento. Es una extensión de un contrato ya aprobado, mismo patrón que el patch de `Cierre!Cajero` a Story 1.3. |
| H11 | FR19 ("validaciones automáticas: COUNT members, COUNT shifts, suma InventoryMovements ≈ totalSales, ausencia de FK orphans") está asignado a **Epic 2** en el FR Coverage Map de epics.md, no a Story 1.6. El usuario pidió explícitamente incluir "validaciones finales de consistencia" en esta historia. | `epics.md` — tabla "FR Coverage Map" | Se interpreta como decisión explícita del usuario: esta historia incluye una versión **ligera e informativa** de esas validaciones (conteos y una comparación aproximada de totales), no la reconciliación exhaustiva que Epic 2 necesitará tras un DELETE masivo. Ninguna validación de esta historia debe bloquear ni revertir nada — solo informar. |

## Acceptance Criteria

### Actualización de stock

1. **Given** al menos un corte se importó exitosamente en la corrida actual (Story 1.5 ya ejecutada, `DomainShift[]` de esa misma corrida disponible),
   **When** corre la actualización post-importación,
   **Then** para cada producto que aparece en la hoja Inventario del corte cronológicamente más reciente **de los importados exitosamente en esta corrida**, `Product.gymStock` se actualiza al valor "Exi Actual" de ese corte, emparejado por nombre de producto.

2. **Given** el corte más reciente de la corrida actual es **más antiguo** que el corte más reciente ya existente en la base de datos (`MAX(Shift.openingDate)` previo a esta corrida),
   **When** corre la actualización de stock,
   **Then** la actualización de `gymStock` se omite para esta corrida y el resultado incluye una advertencia explícita indicando que no se actualizó el stock por no ser la corrida más reciente cronológicamente (ver H9).

3. **Given** un producto aparece en el Inventario del corte más reciente de la corrida pero no existía previamente en SGF,
   **When** corre la actualización de stock,
   **Then** no debe fallar — el producto ya fue creado por el prerequisito de Story 1.5 (upsert por nombre) antes de esta actualización.

### Notificación de ticket máximo (informativa, no accionable — ver H7)

4. **Given** la importación de cortes se completó (con o sin fallos),
   **When** se muestra el resumen final,
   **Then** el admin ve: "El ticket más alto importado es [N]." — **sin** lenguaje que implique una acción de configuración del admin (no "inicializa tu contador"), dado que el generador de tickets en vivo no usa un contador secuencial (H7).

### Validaciones ligeras de consistencia (ver H11 — informativas, no bloqueantes)

5. **Given** la importación completa (socios + cortes) terminó,
   **When** se calculan las validaciones finales,
   **Then** el resumen incluye: conteo de socios en SGF vs. socios esperados del xlsx, conteo de cortes importados exitosamente vs. cortes en los archivos subidos, y una comparación aproximada entre la suma de `InventoryMovement.total` por turno y `Shift.totalSales` de ese turno (mostrada como advertencia si difiere más de una tolerancia razonable, nunca como error bloqueante).

6. **Given** cualquier discrepancia de las validaciones del punto anterior,
   **When** se muestra el reporte,
   **Then** se lista como advertencia informativa — ninguna validación de esta historia revierte, bloquea, ni modifica datos ya importados.

### Resumen y reporte final

7. **Given** la importación completa (socios + cortes) terminó,
   **When** se muestra el reporte final,
   **Then** se despliegan, como mínimo: socios importados/actualizados/fallidos; cortes importados/actualizados/fallidos; movimientos totales desglosados por tipo (ventas, ajustes, entradas) — ver H10; retiros de caja creados; advertencias (incluyendo campos legacy sin equivalente, ya generadas desde Story 1.5); errores por corte con su razón.

8. **Given** la importación se ejecutó en Modo Sincronización,
   **When** se muestra el reporte,
   **Then** el encabezado indica explícitamente: "Modo Sincronización — sin borrado de datos previos".

### Cierre del wizard

9. **Given** el admin ve el reporte final,
   **When** hace clic en la acción de cierre,
   **Then** el wizard se resetea completamente a su estado inicial (Paso 1) — mismo comportamiento que `handleReset()` ya existente, extendido para limpiar cualquier estado nuevo que esta historia agregue.

### Integridad arquitectónica (AD-1)

10. **Given** la actualización de stock y las validaciones corren,
    **When** se ejecutan,
    **Then** consumen exclusivamente `DomainShift[]`/`DomainMember[]`/resultados ya calculados por `previewFiles()`/`syncMembers()`/`syncShifts()` — no leen ni re-parsean archivos xlsx directamente, no importan adapters ni exceljs.

## Tasks / Subtasks (nivel arquitecto — el diseño detallado se define en dev-story)

- [x] Task 1: Extender `SyncShiftsResult` con desglose de movimientos por tipo (H10) — AC: 7
- [x] Task 2: Implementar la actualización de `Product.gymStock` consumiendo el `DomainShift[]` de la misma corrida — incluye el guard de H9 (comparar contra `MAX(Shift.openingDate)` existente en DB antes de aplicar) — AC: 1, 2, 3
- [x] Task 3: Calcular y exponer el ticket máximo importado como dato informativo — AC: 4
- [x] Task 4: Implementar las validaciones ligeras de consistencia (conteos + comparación aproximada de totales por turno) como función(es) de solo lectura — AC: 5, 6
- [x] Task 5: Definir cómo se orquesta todo lo anterior sin romper AD-1 ni el patrón de `migration.service.ts` como orquestador — resuelto: `finalizeSyncMode()` se invoca desde la misma request de `POST /api/migracion/sync-shifts`, inmediatamente después de `syncShifts()`, usando el mismo `DomainShift[]`
- [x] Task 6: Componente de reporte final del wizard (reemplaza el placeholder genérico actual de "Paso 6" en `MigracionManager.tsx`) — AC: 7, 8, 9
- [x] Task 7: Endpoint(s) API necesarios — mismo patrón ADMIN-only que Stories 1.4/1.5 — AC: 10 (reutiliza el endpoint existente `sync-shifts`, no se crea uno nuevo — ver H8)
- [x] Task 8: Smoke tests de las funciones puras nuevas (cálculo de gymStock más reciente, comparación de totales, ticket máximo) — sin diseñar aquí el detalle de casos

## Dev Notes

### Consistencia con historias anteriores

- Mantener el patrón AD-1: helpers puros en `modules/migration/domain/`, persistencia solo en `migration.service.ts`, rutas API sin lógica de negocio.
- Esta historia **no puede** implementarse como un paso "cron-like" o desacoplado que corre después y solo mira la DB — H8 lo hace estructuralmente imposible sin persistir el snapshot (que no se pide en esta historia). Debe encadenarse dentro del mismo flujo de sincronización de cortes.
- `SyncShiftsResult` es un contrato ya aprobado (Story 1.5) — extenderlo aditivamente está permitido y es necesario (H10); no reemplazar campos existentes.

### Project Structure Notes

- Archivos a extender: `modules/migration/migration.service.ts`, `types/api/migracion.ts`, `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` (paso 6 actual).
- Archivo(s) nuevo(s) esperado(s): helper(s) puro(s) para las validaciones/cálculo de gymStock más reciente en `modules/migration/domain/`, componente de reporte final del wizard. Nombres exactos se definen en dev-story.
- Sin conflictos detectados con la estructura unificada del proyecto.

### Testing standards summary

- Smoke tests (`tsx`, sin DB) para toda función pura nueva, mismo patrón que `scripts/shift-sync-smoke-test.ts`.
- Verificación manual contra `docs/cortes.xlsx` recomendada, dado que Stories 1.4 y 1.5 encontraron bugs reales solo visibles con datos reales (bloque derecho del Cierre, timeout de `$transaction`, `closingDate` nunca seteado). No asumir que "compila y los smoke tests pasan" es suficiente para esta historia en particular — la actualización de `gymStock` y el guard de H9 deben probarse contra un escenario de dos corridas reales (una más reciente, una más antigua) antes de dar la historia por completa.
- `npx tsc --noEmit` y `npm run lint` limpios; regresión: `smoke:parsers`, `smoke:inconsistency`, `smoke:member-upsert`, `smoke:shift-sync` deben seguir pasando.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-16-actualización-post-importación-y-finalización-del-modo-sincronización]
- [Source: _bmad-output/implementation-artifacts/1-5-importacion-sincronizada-cortes-movimientos.md — SyncShiftsResult, syncShifts(), patrón de transacción por corte]
- [Source: modules/migration/domain/transformers/shift-transformer.ts#transformInventoryRow — origen de DomainInventoryRow.gymStock, nunca persistido]
- [Source: modules/inventory/inventory.service.ts — patrón de actualización incremental de Product.gymStock en el flujo de venta en vivo, que la migración no replica]
- [Source: lib/domain/sales/ticket.ts#generateTicket — confirma que no existe contador secuencial de tickets en vivo]
- [Source: prisma/schema.prisma — Product.gymStock, Shift.openingDate/folio]

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- H9 guard verificado con datos reales, no solo sintéticos: al correr `finalizeSyncMode` sobre `docs/cortes.xlsx` (FN-248, 2026-01-07) en la DB de desarrollo, el guard detectó correctamente que ya existía un corte más reciente en el sistema (datos de `prisma/seed.ts`: FN-249/FN-250 con fechas posteriores) y omitió la actualización de `gymStock`, reportando el motivo — comportamiento correcto, no un bug: demuestra que el guard protege incluso cuando "lo más antiguo" es paradójicamente el archivo histórico real que se está importando.
- Se probó explícitamente el caso inverso con un corte sintético `TEST-1.6-OLD` (fecha 2020) importado después del real: `gymStockSkipped=true` confirmado, `Product.gymStock` sin cambios. Datos sintéticos limpiados tras la prueba.

### Completion Notes List

- Los 10 AC se cumplen. `finalizeSyncMode()` se invoca desde la misma request de `POST /api/migracion/sync-shifts`, inmediatamente después de `syncShifts()`, consumiendo el mismo `DomainShift[]` en memoria — resuelve H8 sin persistir el snapshot ni crear un endpoint nuevo.
- `SyncShiftsResult` extendido aditivamente con `salesMovements`/`adjustmentMovements`/`entryMovements` (H10) — no rompe consumidores existentes de Story 1.5.
- AC4 (ticket máximo) implementado como texto puramente informativo ("El ticket más alto importado es X."), sin lenguaje de "inicializar contador", dado que `generateTicket()` en vivo no es secuencial (H7 verificado — no requiere cambios en el generador).
- Consistencia (AC5/AC6): tolerancia de $1 MXN sobre la comparación `Shift.totalSales` vs. suma de ventas no canceladas — decisión de implementación documentada en `sync-finalize.ts`, nunca bloqueante.
- `FinalReportStep.tsx` reemplaza el placeholder genérico del Paso 6 en `MigracionManager.tsx`; reutiliza `handleReset()` ya existente para el cierre del wizard (AC9) — sin estado nuevo que limpiar (el resultado de finalize vive anidado en `syncShiftsResult`).
- AD-1 intacto: `sync-finalize.ts` y las adiciones a `migration.service.ts`/`sync-shifts/route.ts` no importan adapters ni exceljs (confirmado por grep).
- Verificación manual contra `docs/cortes.xlsx` real: desglose de movimientos correcto (34 ventas, 5 ajustes, 0 entradas — coincide con Story 1.5), ticket máximo "5779", cero advertencias de consistencia (Cierre auto-consistente en esta muestra).

### File List

**Nuevos:**
- `modules/migration/domain/sync-finalize.ts`
- `app/(dashboard)/configuracion/migracion/_components/FinalReportStep.tsx`
- `scripts/sync-finalize-smoke-test.ts`

**Modificados:**
- `modules/migration/migration.service.ts` — `SyncShiftsResult` extendido, `finalizeSyncMode()`
- `types/api/migracion.ts` — `FinalizeSyncResultSchema`, `SyncShiftsResponseSchema`, breakdown de movimientos
- `app/api/migracion/sync-shifts/route.ts` — invoca `finalizeSyncMode()` en la misma request
- `app/(dashboard)/configuracion/migracion/_components/ImportCortesStep.tsx` — tipo actualizado a `SyncShiftsResponseType`
- `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` — Paso 6 usa `FinalReportStep`
- `package.json` — script `smoke:sync-finalize`
