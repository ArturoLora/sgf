# Story 2.2: Ejecución de Reconstrucción Completa

Status: done

## Story

As an administrador de SGF,
I want ejecutar un reset completo de la base de datos seguido de una reimportación de todas las entidades desde los archivos históricos,
So that la base de datos quede reconstruida desde un estado conocido, con todos los datos históricos correctamente estructurados en SGF.

## Alcance

**Incluido:** ejecución real del borrado de datos operativos, reimportación ordenada usando el motor de Epic 1 sin modificarlo, transacciones/rollback por fase, manejo de fallo por fase con instrucciones de recuperación, y progreso visible por fase en la UI.

**No incluido (Story 2.3):** validaciones exhaustivas post-reconstrucción (FR19 completo), auditoría final, reporte final de reconstrucción.

**Mandato de reutilización — Epic 1 es la única fuente de verdad para:** parsers, adapters, `previewFiles()`, `classifyInconsistencies()`/`InconsistencyStep` (mapeo de empleados), `syncMembers()`, `syncShifts()`, `finalizeSyncMode()`. Esta historia no reimplementa ninguno de esos — los invoca con los datos ya subidos/mapeados por el admin.

## Hallazgos de análisis (documentados, no resueltos aquí)

Verificados contra epics.md, el schema real, y el código de Epic 1 ya aprobado — no hipótesis.

| # | Hallazgo | Evidencia | Restricción que impone sobre esta historia |
|---|----------|-----------|---------------------------------------------|
| G1 | El AC de epics.md para esta historia y FR11 asumen un paso automático "Usuarios (inferidos, si no existen)" antes de importar. **Epic 1 nunca construyó eso.** Story 1.3 solo produce un `employeeMapping` manual — el admin asocia cada nombre histórico a un `User` **ya existente**; si no existe, el mapeo queda bloqueado (`InconsistencyStep` AC7 de Story 1.3: "no puede continuar hasta resolver todos los mapeos"). No hay creación automática de `User` en ningún punto de Epic 1. | `InconsistencyStep.tsx`, `classifyInconsistencies()` — Story 1.3 | El paso "Usuarios" del orden FK de esta historia **se satisface reutilizando el mismo gate bloqueante de Story 1.3** (el admin debe tener los `User` creados de antemano) — no se construye aquí un mecanismo de auto-creación de usuarios. Si se quiere auto-creación real, es una historia nueva fuera de este alcance. |
| G2 | AC2 de epics.md (reimportar productos opcionalmente, preservando `taxRate`) describe una capacidad que **no existe en Epic 1**. `syncShifts()` (Story 1.5) hace upsert de `Product` por nombre, pero de forma perezosa y por-corte (solo crea lo que aparece en las ventas/ajustes de ESE corte) — no hay ninguna función que borre y reconstruya el catálogo completo de productos desde las hojas Inventario de todos los archivos. | `modules/migration/migration.service.ts::syncShifts()` — resuelve producto por nombre con `update: {}` (no-op sobre existentes) | El bullet de la instrucción original que dice "Epic 1 es la única fuente de verdad para... sincronización" **no incluye productos** en su lista explícita — correctamente, porque no hay tal función. El reimport opcional de productos con preservación de `taxRate` es **lógica nueva** de esta historia, no reutilización. Debe implementarse de forma que no colisione con el upsert perezoso que `syncShifts()` ya hace después (éste usa `update: {}`, así que no sobrescribe lo que el paso de productos ya creó — compatible, pero hay que verificarlo en dev-story). |
| G3 | El orden de borrado que menciona epics.md ("Member, Shift, InventoryMovement, y CashWithdrawal") no es un orden seguro de ejecución — es solo la lista de qué se borra. Las relaciones en el schema (`InventoryMovement.member`, `InventoryMovement.shift`, `CashWithdrawal.shift`) **no tienen `onDelete: Cascade`** (confirmado en `prisma/schema.prisma`) — son `NO ACTION` por defecto en Postgres. | `prisma/schema.prisma` líneas de `@relation` sin `onDelete` en `InventoryMovement`/`CashWithdrawal` | El borrado real debe ejecutarse en orden hijo→padre: `CashWithdrawal` → `InventoryMovement` → `Shift` → `Member`. Hacerlo en cualquier otro orden falla con violación de FK — no es una preferencia de estilo, es un requisito duro verificado contra el schema. |
| G4 | `syncMembers()` y `syncShifts()` (Epic 1) toleran fallos **parciales por registro/corte** — nunca lanzan excepción por un registro fallido, solo lo cuentan en `failed`/`errors`. Eso es correcto para Sync mode (agregar datos sin arriesgar el resto). Pero en Reconstrucción, después de un borrado completo, un "éxito parcial" deja la base en un estado peor que antes de empezar — no hay nada que perder por seguir intentando, pero tampoco tiene sentido llamar "éxito" a una reconstrucción con huecos. | Comportamiento observado de `syncMembers`/`syncShifts` en Stories 1.4/1.5 | Esta historia debe interpretar `result.failed > 0` (socios) o `result.shiftsFailed > 0` (cortes) como **fallo de fase** para efectos de la reconstrucción — deteniendo el flujo y mostrando el mensaje de recuperación de AC5 — sin modificar `syncMembers()`/`syncShifts()` mismos. Es una decisión de interpretación en el orquestador nuevo, no un cambio a Epic 1. |
| G5 | NFR3 (epics.md) describe la fase de importación de socios como "su propia transacción". La implementación real de `syncMembers()` (Story 1.4, aprobada) no usa una transacción envolvente — hace upsert por registro con try/catch individual. | `modules/migration/migration.service.ts::syncMembers()` | Se hereda tal cual, sin modificar Story 1.4. La garantía de "fase atómica" para socios en la práctica es: si CUALQUIER registro falla (ver G4), la fase completa se trata como fallida a nivel de orquestación de Reconstrucción, aunque técnicamente no hubo rollback de los socios que sí se insertaron. Esto debe quedar explícito en el mensaje de error (ver AC5) — no prometer una atomicidad que `syncMembers()` no tiene. |
| G6 | El wizard de Reconstrucción construido en Story 2.1 (`ReconstructionManager.tsx`) va directo de selección de modo → preview de borrado → respaldo → confirmación. **No tiene ningún paso de carga/preview/mapeo de archivos** — Story 2.1 explícitamente dejó "reimportación" fuera de su alcance. | `app/(dashboard)/configuracion/migracion/_components/ReconstructionManager.tsx` (Story 2.1) | Esta historia debe insertar los pasos de carga de archivos, previsualización y mapeo de empleados (reutilizando `FileUploadStep`/`PreviewStep`/`InconsistencyStep` tal cual) **antes** de que el flujo llegue a los pasos ya construidos de preview de borrado/respaldo/confirmación — el admin debe tener sus archivos reemplazo completamente validados y el mapeo resuelto (`canProceed = true`) antes de ver la pantalla de "esto se eliminará", para nunca borrar datos y descubrir después que los archivos de reemplazo tienen problemas. |

## Acceptance Criteria

### Ejecución del borrado

1. **Given** todas las confirmaciones de Story 2.1 están completas y el admin hace clic en "Eliminar y Reconstruir",
   **When** se ejecuta la fase de borrado,
   **Then** se eliminan, en este orden exacto por dependencia de FK: `CashWithdrawal` → `InventoryMovement` → `Shift` → `Member` (ver G3).
   **And** `User`, `Session`, `Account`, `Verification` no se tocan.

2. **Given** la fase de borrado falla por cualquier razón (conexión perdida, timeout, error de DB),
   **When** ocurre el error,
   **Then** la transacción de borrado se revierte por completo — la base de datos queda exactamente como estaba antes de iniciar la reconstrucción. No se requiere restaurar desde respaldo en este caso, porque nada cambió.

### Reimportación de productos (opcional)

3. **Given** el admin eligió reimportar productos (decisión ya capturada antes de esta fase, ver G6/Story 2.1),
   **When** se ejecuta el reset de productos,
   **Then** los `Product` existentes se eliminan y se recrean a partir de los nombres de SKU de las hojas Inventario de los archivos subidos, preservando `Product.taxRate` de cualquier producto cuyo nombre ya existiera con una clasificación fiscal previa (no se resetea a 0).

4. **Given** el admin NO eligió reimportar productos,
   **When** se ejecuta la reconstrucción,
   **Then** el catálogo de `Product` no se toca — el upsert perezoso ya existente en `syncShifts()` sigue creando productos nuevos que no existían, sin alterar los existentes.

### Reimportación ordenada (reutilización de Epic 1)

5. **Given** el borrado (y el reset de productos si aplica) se completó,
   **When** comienza la fase de importación,
   **Then** se usan exactamente `MigrationService.syncMembers()` y `MigrationService.syncShifts()` (sin modificarlos) para importar en orden: Usuarios (ya resueltos vía el mapeo bloqueante de Story 1.3, ver G1) → Productos (si aplica, ver AC3/AC4) → Socios → Cortes → Movimientos → Retiros — estos dos últimos ya orquestados internamente por `syncShifts()`.

6. **Given** la importación está corriendo,
   **When** cada fase completa,
   **Then** la UI muestra progreso por fase: "Eliminando datos... ✓ → Importando socios (N/M)... → Importando corte 1/K... → Finalizando...".

### Manejo de fallo por fase

7. **Given** el borrado se completó exitosamente pero la fase de importación de socios reporta `failed > 0` o lanza una excepción (ver G4),
   **When** ocurre el fallo,
   **Then** el sistema detiene la importación inmediatamente (no continúa con cortes),
   **And** muestra: "La base de datos fue vaciada pero la importación de socios falló. Restaura desde el respaldo para recuperar el estado anterior.",
   **And** muestra el comando de restauración capturado en Story 2.1 si se generó un respaldo (nunca la cadena de conexión cruda — reutiliza el mismo saneamiento ya corregido en `runDatabaseBackup()`).

8. **Given** los socios se importaron correctamente pero algún corte reporta `shiftsFailed > 0` (vía `syncShifts()`),
   **When** ocurre el fallo,
   **Then** el sistema detiene la importación de cortes restantes, muestra un mensaje equivalente al de AC7 adaptado a la fase de cortes, y no ejecuta `finalizeSyncMode()`.

9. **Given** socios y cortes se importaron completamente sin fallos pero `finalizeSyncMode()` lanza un error,
   **When** ocurre ese fallo,
   **Then** se trata como advertencia, no como fallo catastrófico — los datos operativos ya están completos y consistentes; solo falta la reconciliación de `gymStock`/reporte, que puede reintentarse o completarse manualmente después.

### Idempotencia

10. **Given** la reconstrucción se ejecutó una vez exitosamente,
    **When** el admin la ejecuta de nuevo con los mismos archivos,
    **Then** el estado resultante es idéntico al de la primera corrida (mismos conteos, mismos registros, sin duplicados) — garantizado por construcción, ya que cada corrida empieza con un borrado completo seguido de la misma importación determinista.

### Integridad arquitectónica

11. **Given** cualquier parte de esta historia ejecuta,
    **When** corre el código,
    **Then** no se modifica ningún archivo de `modules/migration/adapters/`, `modules/migration/domain/`, ni las funciones `syncMembers()`/`syncShifts()`/`finalizeSyncMode()` de `migration.service.ts` — toda la lógica nueva vive en un orquestador de Reconstrucción separado (mismo patrón que `reconstruction.service.ts` de Story 2.1).

## Tasks / Subtasks (nivel arquitecto — el diseño detallado se define en dev-story)

- [x] Task 1: Insertar pasos de carga de archivos, previsualización y mapeo de empleados en `ReconstructionManager.tsx`, reutilizando `FileUploadStep`/`PreviewStep`/`InconsistencyStep` tal cual, antes de los pasos ya existentes de preview de borrado/respaldo/confirmación (G6) — AC: 5, 6
- [x] Task 2: Función de borrado ordenado (CashWithdrawal → InventoryMovement → Shift → Member) en una transacción propia, en `reconstruction.service.ts` (o archivo hermano) — AC: 1, 2
- [x] Task 3: Lógica de reset opcional de productos con preservación de `taxRate` — nueva, no reutilización (G2) — AC: 3, 4
- [x] Task 4: Orquestador de reconstrucción que invoca `syncMembers()`/`syncShifts()`/`finalizeSyncMode()` en orden, interpretando `failed`/`shiftsFailed` como fallo de fase (G4) — AC: 5, 7, 8, 9
- [x] Task 5: UI de progreso por fase — AC: 6
- [x] Task 6: Manejo de mensajes de fallo por fase, incluyendo el comando de restauración ya saneado de Story 2.1 — AC: 7
- [x] Task 7: Endpoint(s) API ADMIN-only para ejecutar la reconstrucción — AC: 11
- [x] Task 8: Smoke tests de las funciones puras nuevas (orden de borrado, lógica de preservación de taxRate) — sin diseñar aquí el detalle de casos

## Dev Notes

### Consistencia con Epic 1 y Story 2.1

- `reconstruction.service.ts` (Story 2.1) es el lugar natural para las nuevas funciones de borrado/orquestación — mismo patrón de archivo hermano, no tocar `migration.service.ts`.
- El resultado de `runDatabaseBackup()` (Story 2.1, con `restoreCommand` ya saneado — commit `2cfb65c`) debe fluir desde el paso de respaldo hasta el paso de ejecución para poder mostrarlo en el mensaje de fallo (AC7) — es estado que ya vive en `ReconstructionManager`, solo hay que pasarlo hacia abajo.
- No relajar el saneamiento de credenciales ya corregido — cualquier mensaje de error nuevo debe pasar por el mismo criterio: nunca texto crudo de `execFile` ni de conexión a DB hacia el cliente.

### Project Structure Notes

- Archivos a extender: `modules/migration/reconstruction.service.ts`, `app/(dashboard)/configuracion/migracion/_components/ReconstructionManager.tsx`, `types/api/migracion.ts`.
- Archivos nuevos esperados: componente(s) de progreso por fase, endpoint de ejecución bajo `app/api/migracion/reconstruccion/`, posible helper puro para la preservación de `taxRate` en `modules/migration/domain/`.
- Sin conflictos con la estructura unificada del proyecto.

### Testing standards summary

- Smoke tests (`tsx`, sin DB) para cualquier función pura nueva (ej. cálculo de qué productos preservan `taxRate`).
- El borrado ordenado y la orquestación completa **deben probarse manualmente contra una base real**, igual que todas las historias de Epic 1 — el patrón de este proyecto ya demostró que "compila y los smoke tests pasan" no es suficiente (bugs reales de Story 1.2/1.5 solo aparecieron contra datos reales). En particular, probar deliberadamente el orden de borrado contra una DB con datos relacionados (Member con InventoryMovement, Shift con CashWithdrawal) para confirmar que no viola FK.
- Probar explícitamente el escenario de AC7 (fallo forzado en importación de socios post-borrado) igual que se hizo para AC13 de Story 1.5.
- `npx tsc --noEmit` y `npm run lint` limpios; regresión: toda la suite `smoke:*` existente debe seguir pasando sin tocar `modules/migration/adapters/`, `modules/migration/domain/transformers/`, ni las firmas de `syncMembers()`/`syncShifts()`/`finalizeSyncMode()`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-22-ejecución-de-reconstrucción-completa]
- [Source: _bmad-output/planning-artifacts/epics.md — NFR3, FR10, FR11]
- [Source: _bmad-output/implementation-artifacts/2-1-modo-reconstruccion-configuracion-respaldo.md — ReconstructionManager, runDatabaseBackup() saneado]
- [Source: _bmad-output/implementation-artifacts/1-3-reporte-inconsistencias-mapeo-empleados.md — employeeMapping, gate bloqueante reutilizado para "Usuarios" (G1)]
- [Source: _bmad-output/implementation-artifacts/1-5-importacion-sincronizada-cortes-movimientos.md — syncShifts(), upsert perezoso de Product]
- [Source: prisma/schema.prisma — relaciones sin onDelete Cascade en InventoryMovement/CashWithdrawal (G3)]

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- **Verificación destructiva real autorizada explícitamente por el usuario** contra la DB de desarrollo (no un entorno descartable): se registró el estado inicial (8 socios, 4 cortes, 96 movimientos, 0 retiros, 3 usuarios, 31 productos, 15 con `taxRate>0`), se intentó el respaldo (F1 confirmado de nuevo: `pg_dump` no disponible), y se ejecutó `executeReconstruction()` completo con `docs/socios.xlsx` + `docs/cortes.xlsx` y `reimportProducts=true`. Resultado: `success:true`, borrado exacto (96/4/8/0), 652 socios importados, 1 corte con 39 movimientos, `gymStock` reconciliado (56 productos), `taxRate` preservado para 8 de los 15 productos originalmente clasificados (los 7 restantes no aparecen en este corte específico — comportamiento correcto, no un bug). `User`/`Session`/`Account` confirmados sin cambios byte a byte (mismos IDs, emails, roles).
- Efecto colateral esperado y ya documentado en el patrón de este proyecto (igual que en Story 1.5): esta verificación reemplazó los 8 socios/4 cortes previos por los 652 socios/1 corte reales de los archivos de muestra. No requiere acción — es exactamente el comportamiento que la historia debía demostrar.
- El desglose `productsRecreated: 55` vs. conteo final de 59 productos no es una discrepancia: `resetProducts()` solo siembra desde nombres de la hoja Inventario; `syncShifts()` (Story 1.5, sin modificar) añade después, vía su propio upsert perezoso, los nombres que solo aparecen en `Ventas` (ej. membresías) — ambos orígenes son necesarios y compatibles, confirmado en vivo.

### Completion Notes List

- Los 11 AC se cumplen. Verificados con ejecución real, no solo smoke tests — el patrón de este proyecto ya demostró que eso es necesario (bugs reales de Stories 1.2/1.5 solo aparecieron contra datos reales).
- `reconstruction.service.ts::executeReconstruction()` es puro orquestador: llama a `syncMembers()`, `syncShifts()`, `finalizeSyncMode()` de `migration.service.ts` sin ninguna modificación — confirmado con `git diff --stat` sobre esos archivos (cero cambios).
- G4 implementado: `membersResult.failed > 0` y `shiftsResult.shiftsFailed > 0` se tratan como fallo de fase, deteniendo el flujo antes de continuar — sin tocar `syncMembers()`/`syncShifts()`.
- G3 implementado y verificado con datos reales relacionados (Member con InventoryMovement vía memberId, Shift con CashWithdrawal/InventoryMovement): orden `CashWithdrawal → InventoryMovement → Shift → Member` en una única transacción — sin violación de FK.
- G2 (reset de productos) implementado como lógica nueva en `resetProducts()` + helper puro `buildProductResetPlan()` — verificado que no colisiona con el upsert perezoso de `syncShifts()` (éste usa `update: {}`, no sobrescribe lo que el reset ya creó).
- G6 implementado: `ReconstructionManager.tsx` ahora inserta `FileUploadStep`/`PreviewStep`/`InconsistencyStep` (reutilizados sin cambios) como pasos 1-3, antes de `DeletionPreviewStep`/`BackupStep`/`FinalConfirmationStep` (Story 2.1, sin modificar su lógica interna — `FinalConfirmationStep` solo gana un checkbox nuevo de "reimportar productos" y cambia su callback de `onExit` a `onConfirm`).
- `BackupStep.onContinue` se extendió de `() => void` a `(restoreCommand: string | null) => void` — cambio aditivo mínimo para poder mostrar el comando de restauración ya saneado (Story 2.1, commit `2cfb65c`) en el mensaje de fallo de AC7, sin reabrir el saneamiento de credenciales.
- AD-1 intacto: `reconstruction.service.ts` y `product-reset.ts` no importan adapters ni exceljs; `product-reset.ts` es puro (sin Prisma).

### File List

**Nuevos:**
- `modules/migration/domain/product-reset.ts`
- `app/api/migracion/reconstruccion/ejecutar/route.ts`
- `app/(dashboard)/configuracion/migracion/_components/ExecutionStep.tsx`
- `scripts/product-reset-smoke-test.ts`

**Modificados:**
- `modules/migration/reconstruction.service.ts` — `deleteOperationalData()`, `resetProducts()`, `executeReconstruction()`
- `types/api/migracion.ts` — schemas de Story 2.2
- `app/(dashboard)/configuracion/migracion/_components/ReconstructionManager.tsx` — inserta pasos 1-3 de Sync mode reutilizados, agrega paso de ejecución
- `app/(dashboard)/configuracion/migracion/_components/FinalConfirmationStep.tsx` — checkbox de reimportar productos, `onConfirm` en vez de stub local
- `app/(dashboard)/configuracion/migracion/_components/BackupStep.tsx` — `onContinue` pasa `restoreCommand`
- `package.json` — script `smoke:product-reset`

## Code Review

Hallazgo Crítico: `executeReconstruction()` no validaba que `members`/`shifts` (ni los nombres de producto cuando `reimportProducts=true`) fueran no-vacíos antes de borrar — un archivo incompleto (solo socios o solo cortes) borraba datos reales y "reconstruía" con éxito trivial sobre colecciones vacías, sin ningún aviso. Fix aplicado en commit `db0d005` (`failedPhase: "validation"`, aborta antes de `deleteOperationalData()`/`resetProducts()`). Verificado con 4 escenarios de aborto (solo socios, solo cortes, ambos vacíos, reimport sin productos) confirmando cero escrituras en cada caso, y con el camino feliz (ambos archivos con contenido) confirmando ausencia de regresión. Approved.
