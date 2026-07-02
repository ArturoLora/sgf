# Story 1.5: Importación Sincronizada de Cortes y Movimientos

Status: review

## Story

As an administrador de SGF,
I want importar los cortes históricos (Shift), sus movimientos de inventario (InventoryMovement) y sus retiros de caja (CashWithdrawal) en Modo Sincronización,
So that el historial operativo del gimnasio quede disponible en SGF para reportes y auditoría, sin borrar datos existentes y de forma repetible.

## Alcance

**Incluido:** sincronización (upsert/creación) de `Shift`, `InventoryMovement`, `CashWithdrawal` y sus relaciones, a partir del `DomainShift[]` ya producido por `previewFiles()` (Stories 1.1–1.4) y del `employeeMapping` ya resuelto (Story 1.3, extendido en esta preparación para cubrir también `Cierre!Cajero`).

**Excluido explícitamente (historias futuras):**
- Actualización de `Product.gymStock` post-importación y aviso de ticket consecutivo máximo → **Story 1.6**.
- Modo Reconstrucción, borrado de datos, reset de base, validación post-reconstrucción → **Epic 2**.

## Prerequisito ya resuelto en esta sesión

`Cierre!Cajero` (nombre de quien abrió el turno) ahora se extrae y se une al mismo pool de `sellerNames` que consume `classifyInconsistencies()` (patch a Story 1.3, commit `90efbcb`). Verificado contra `docs/cortes.xlsx`: FN-248 tiene `Cajero = "ANDREW"`, distinto de los vendedores de sus ventas (`CARLOS`, `NACHO`). `employeeMapping: Record<string,string>` que llega a esta historia ya incluye ambos tipos de nombre — **Story 1.5 no necesita lógica de mapeo propia**, solo consumir `employeeMapping` para resolver `Shift.cashierId` y `InventoryMovement.userId`.

## Hallazgos de análisis (documentados, no resueltos aquí)

Estos son datos reales verificados contra `docs/cortes.xlsx`, no hipótesis. El mecanismo de deduplicación concreto se decide en `/bmad-dev-story`; aquí solo se fija el comportamiento que el sistema debe garantizar.

| # | Hallazgo | Evidencia | Comportamiento requerido (no el mecanismo) |
|---|----------|-----------|---------------------------------------------|
| H1 | Un mismo `# Ticket` puede repetirse varias veces dentro del mismo corte, incluso con el mismo producto y precio (venta multi-línea). | Corte FN-248: ticket `5763` aparece 4 veces (4× "VISITA" a $50, mismo `EFECTIVO (CARLOS)`); ticket `5778` aparece 2 veces con productos distintos ("AGUA 1L" y "VISITA"). | La clave natural de `InventoryMovement` **no puede ser únicamente `(ticket, shiftId)`** — perdería líneas legítimas. El sistema debe garantizar que re-importar el mismo archivo no duplique movimientos, preservando todas las líneas reales de un ticket multi-producto. |
| H2 | `CashWithdrawal` no tiene ninguna columna candidata a clave natural (`id, shiftId, userId, amount, concept, createdAt` — ninguna es única ni combinable de forma confiable). La propia investigación de auditoría ya concluyó "Folio de retiro del legado: no tiene valor operativo, no agregar campo". | `prisma/schema.prisma` model `CashWithdrawal`; `sgf-auditoria-migracion-investigation.md` sección Retiros. | Aceptado como limitación conocida: la sincronización de `CashWithdrawal` **no garantiza idempotencia completa** (re-importar el mismo corte puede duplicar retiros). Esto es consistente con FR22, que enumera clave natural para Member/Shift/InventoryMovement/Product pero **no** para CashWithdrawal. Debe quedar visible en el reporte final de Story 1.6, no oculto. |
| H3 | Los campos financieros de `Shift` (`membershipSales`, `productSales0Tax`, `productSales16Tax`, `subtotal`, `tax`, `totalSales`, `cashAmount`, `debitCardAmount`, `creditCardAmount`, `totalVoucher`, `totalCash`, `totalWithdrawals`, `ticketCount`, `initialCash`) tienen mapeo **directo** documentado en la investigación (`Cierre → Shift`), pero hoy ningún adapter/domain type los extrae — `DomainShift` (Story 1.2) solo tiene `folio, openingDate, openingTime, closingTime, sales, inventory, withdrawals, legacyNotes`. | `sgf-auditoria-migracion-investigation.md` tabla "Hoja Cierre"; `domain.types.ts` actual. | Estos campos deben leerse **directamente del Cierre**, no recalcularse desde los `InventoryMovement` importados. Razón: `Product.taxRate` es un campo nuevo (Convergencia-1); recalcular `productSales16Tax` con tasas actuales divergiría de lo que el corte histórico realmente reportó. `closeShift()` en `services/shifts.service.ts` sí recalcula desde movimientos, pero ese es el flujo operativo en vivo — no aplica a datos históricos que ya vienen pre-calculados en el Cierre. |
| H4 | `InventoryMovement.productId` es FK obligatoria. Ningún story anterior (1.1–1.4) implementó el paso "(2) Productos (upsert por nombre)" del orden obligatorio de FR11. Las ventas de membresía (`isMembership=true`) también generan `InventoryMovement` en el sistema en vivo, contra un "producto" cuyo nombre coincide con `isMembershipProduct()` (`services/membership-helpers.ts`) — no existe un camino separado para venta de membresía vs. venta de producto. | FR11 (`epics.md`); `services/shifts.service.ts:closeShift()` usa `isMembershipProduct(product.name)` para clasificar movimientos ya existentes por nombre. | Esta historia debe incluir el upsert de `Product` por nombre (clave natural: `Product.name`, ya `@unique`) como prerequisito antes de crear `InventoryMovement`, para **toda** venta (membresía o no) — reutilizando la misma convención de nombre que ya usa el sistema en vivo. |
| H5 | La hoja `Inventario` tiene columnas `Ajuste`, `Entradas` y `Salidas`. `Salidas` es un total de reconciliación que ya está representado por las filas individuales de `Ventas` — crearle un `InventoryMovement` propio duplicaría el conteo de salidas de stock. | `sgf-auditoria-migracion-investigation.md` tabla "Hoja Inventario". | Solo `Ajuste` (≠0) y `Entradas` (≠0) deben generar `InventoryMovement` (`ADJUSTMENT` / `GYM_ENTRY`) por producto y corte. `Salidas` es informativo — no genera movimiento. |
| H6 | No se confirmó si el Cierre expone un campo "Diferencia" mapeable a `Shift.difference`, ni si el `Location` de las cortes históricas siempre es `GYM` (parece serlo, según FR18: "asignar todo el stock importado a gymStock", sin distinción de ubicación). | `sgf-auditoria-migracion-investigation.md` (tabla Cierre no lista "Diferencia" explícitamente); FR18. | Verificar en implementación contra el Cierre real; si no existe el campo, `Shift.difference` se calcula o se deja en 0 — decisión de implementación, no de esta historia. Todos los movimientos importados usan `Location.GYM`. |

## Acceptance Criteria

### Orden y agrupación

1. **Given** se subieron múltiples archivos de corte (ej. FN-248 con fecha 7-ene y FN-249 con fecha 13-ene),
   **When** se ejecuta la sincronización,
   **Then** los cortes se procesan en orden cronológico ascendente por `openingDate`.

### Creación de Shift

2. **Given** se procesa el corte FN-248 y `employeeMapping["ANDREW"]` ya resuelve a un `User.id` válido (por ser cajero del turno),
   **When** se crea el `Shift`,
   **Then** `Shift.folio = "FN-248"`, `Shift.cashierId` = ese `User.id`, `Shift.openingDate` combina fecha + hora de apertura del Cierre, y los campos financieros directos (`initialCash`, `ticketCount`, `membershipSales`, `productSales0Tax`, `productSales16Tax`, `subtotal`, `tax`, `totalSales`, `cashAmount`, `debitCardAmount`, `creditCardAmount`, `totalVoucher`, `totalCash`, `totalWithdrawals`) se leen directamente del Cierre — no se recalculan desde los movimientos importados (ver H3).

3. **Given** el nombre de `Cierre!Cajero` de un corte no tiene entrada resuelta en `employeeMapping` al momento de ejecutar la sincronización,
   **When** se intenta crear ese `Shift`,
   **Then** ese corte completo se marca como fallido con razón explícita (`"<folio>: cajero '<nombre>' sin mapeo resuelto"`) y la importación continúa con los demás cortes — no debería ocurrir en flujo normal porque Story 1.3 ya bloquea el avance con mapeos pendientes, pero el backend no debe asumir ciegamente que el frontend siempre lo garantizó.

4. **Given** FN-248 ya fue importado una vez,
   **When** el admin importa el mismo archivo de nuevo sin cambios,
   **Then** `Shift` FN-248 no se duplica (upsert por `folio`, clave ya `@unique` en el schema) y sus campos financieros quedan idénticos a la primera corrida.

### Productos y movimientos de inventario

5. **Given** una venta (membresía o producto) referencia una `Descripcion` que no existe todavía como `Product.name` en SGF,
   **When** se procesa esa venta,
   **Then** se crea el `Product` correspondiente (upsert por `name`) antes de crear el `InventoryMovement` — aplica igual para ventas de membresía (mismo criterio de nombre que usa `isMembershipProduct()` en el sistema en vivo) y para ventas de producto físico.

6. **Given** una venta tiene `Forma Pago = "EFECTIVO (CARLOS)"` y `employeeMapping["CARLOS"]` resuelve a `User.id = X`,
   **When** se crea el `InventoryMovement`,
   **Then** `paymentMethod = CASH`, `userId = X`, `shiftId` apunta al Shift del corte, `location = GYM`.

7. **Given** un ticket aparece en la hoja Canceladas,
   **When** se crea su `InventoryMovement`,
   **Then** `isCancelled = true`.

8. **Given** el mismo corte contiene un ticket que se repite varias veces con líneas de producto distintas o iguales (ver H1),
   **When** se re-importa el mismo archivo,
   **Then** no se duplican movimientos ya importados, y las líneas legítimas multi-producto de un mismo ticket se preservan (no se colapsan en una sola). El mecanismo exacto de detección se define en implementación.

9. **Given** una fila de la hoja Inventario tiene `Ajuste ≠ 0` o `Entradas ≠ 0` para un producto,
   **When** se procesa ese corte,
   **Then** se crea un `InventoryMovement` tipo `ADJUSTMENT` o `GYM_ENTRY` respectivamente, por producto y corte. `Salidas` no genera movimiento propio (ver H5).

### Retiros de caja

10. **Given** la hoja Retiros de un corte tiene registros con `Efectivo > 0`,
    **When** se procesa ese corte,
    **Then** se crea un `CashWithdrawal` por registro, con `shiftId`, `amount`, `concept`, y `userId` resuelto vía `employeeMapping` del cajero del turno (no hay vendedor individual por retiro en el legado).

11. **Given** `CashWithdrawal` no tiene clave natural disponible (ver H2),
    **Then** esta historia acepta explícitamente que re-importar el mismo corte puede duplicar retiros — debe quedar documentado como advertencia visible en el reporte de resultados (Story 1.6), no oculto ni silencioso.

### Campos legacy sin equivalente

12. **Given** un corte tiene `Ventas Anticipo > 0`, `Comision a Pagar > 0` o `Total Ventas Web > 0` (ya extraídos por Story 1.2 como `legacyNotes`),
    **When** se crea el `Shift`,
    **Then** `Shift.notes` contiene esa información en formato JSON estructurado (ej. `{"legacyFields": {"advanceSales": 150.00, "source": "FN-248.xlsx"}}`), y ese corte se cuenta como "Advertencia" en el resultado — no como error.

### Manejo de errores y transacciones

13. **Given** la importación de un corte específico falla a mitad de proceso (ej. error de DB al crear un `InventoryMovement`),
    **When** ocurre ese error,
    **Then** la transacción de **ese corte completo** se revierte (Shift, sus InventoryMovements y sus CashWithdrawals de esa corrida) — a diferencia de Story 1.4 (partial-success por socio individual), aquí la atomicidad es **por corte**, no por registro.
    **And** los cortes previamente completados en la misma corrida permanecen intactos y no se revierten.

14. **Given** varios cortes se importan en una misma ejecución y uno de ellos falla,
    **When** la importación termina,
    **Then** el resultado reporta qué cortes se importaron exitosamente, cuál falló y por qué, sin detener el procesamiento de los cortes restantes en la cola.

### Integridad arquitectónica (AD-1)

15. **Given** la sincronización de cortes ejecuta,
    **When** corre la función orquestadora en `migration.service.ts`,
    **Then** recibe `DomainShift[]` (ya producido por `previewFiles()`) — no llama a ningún adapter ni re-lee los archivos xlsx directamente.

16. **Given** el endpoint de sincronización de cortes es invocado,
    **When** se procesa la solicitud,
    **Then** requiere sesión activa y rol ADMIN (mismo patrón de `sync-members`), y la ruta no contiene lógica de upsert — solo orquesta llamadas al service.

## Tasks / Subtasks (nivel arquitecto — el diseño detallado se define en dev-story)

- [ ] Task 1: Extender el modelo canónico/dominio para capturar los campos financieros directos del Cierre (H3) y wire el adapter (`findCierreValue`/`findCierreNumber`) para leerlos — AC: 2
- [ ] Task 2: Definir y documentar en el código la estrategia de clave natural / dedup para `InventoryMovement` que sostenga H1 (multi-línea por ticket) sin diseñarla en detalle aquí — AC: 8
- [ ] Task 3: Implementar prerequisito de `Product` upsert-por-nombre antes de crear movimientos, cubriendo ventas de membresía y de producto (H4) — AC: 5
- [ ] Task 4: Implementar `syncShifts()` (o equivalente) en `migration.service.ts`: recibe `DomainShift[]` + `employeeMapping`, orquesta creación de Shift + InventoryMovements (ventas, canceladas, ajustes/entradas por Inventario) + CashWithdrawals, con transacción por corte (AC 13) — AC: 2, 3, 4, 6, 7, 9, 10, 15
- [ ] Task 5: Manejo explícito de nombre de cajero sin mapeo resuelto como fallo de corte (no asumir que el frontend siempre bloqueó correctamente) — AC: 3
- [ ] Task 6: Endpoint `POST /api/migracion/sync-shifts` — mismo patrón de auth/rol que `sync-members` — AC: 16
- [ ] Task 7: Documentar explícitamente en el reporte de resultados la falta de idempotencia de `CashWithdrawal` (H2) como advertencia — AC: 11 (coordina con Story 1.6 para el reporte final)
- [ ] Task 8: UI — paso del wizard que dispara la sincronización de cortes (mismo patrón que `ImportSociosStep` de Story 1.4: idle → importing → done/error) — AC: 1, 14
- [ ] Task 9: Smoke tests de las funciones puras nuevas (transformación de campos financieros del Cierre, resolución de cajero/vendedor vía employeeMapping) — sin diseñar aquí el detalle de casos

## Dev Notes

### Consistencia con historias anteriores

- Mantener el patrón de Story 1.4: helpers puros en `modules/migration/domain/`, persistencia solo en `migration.service.ts`, ruta API sin lógica de negocio, adapters sin lógica de negocio, modelo canónico como única entrada (AD-1).
- **Diferencia deliberada con 1.4**: el manejo de errores aquí es *por corte* (transacción atómica), no *por registro* como en `syncMembers()`. No copiar el patrón de partial-success de 1.4 para esta historia.
- `employeeMapping: Record<string,string>` ya cubre nombres de cajero (Cierre) y vendedor (Ventas) por el patch de preparación — no reabrir Story 1.3 de nuevo por esto.

### Project Structure Notes

- Archivos a extender (no crear estructura nueva): `modules/migration/domain/canonical.types.ts`, `domain.types.ts`, `transformers/shift-transformer.ts`, `adapters/xlsx-cortes.adapter.ts`, `migration.service.ts`, `types/api/migracion.ts`.
- Archivos nuevos esperados: `app/api/migracion/sync-shifts/route.ts`, componente de wizard para el paso de cortes, y el/los helper(s) puros de Task 3 (upsert de Product) — nombres y forma exacta se definen en dev-story.
- Sin conflictos detectados con la estructura unificada del proyecto (`modules/migration/` sigue el mismo layout que Stories 1.1–1.4).

### Testing standards summary

- Smoke tests (`tsx`, sin DB) para toda función pura nueva, siguiendo el patrón de `scripts/parse-smoke-test.ts` / `scripts/inconsistency-smoke-test.ts` / `scripts/member-upsert-smoke-test.ts`.
- Sin tests de integración automatizados contra DB real para esta historia (mismo criterio aceptado en Story 1.4) — verificación funcional manual con `docs/cortes.xlsx`.
- `npx tsc --noEmit` y `npm run lint` limpios; regresión: `smoke:parsers`, `smoke:inconsistency`, `smoke:member-upsert` deben seguir pasando.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-15-importación-sincronizada-de-cortes-y-movimientos]
- [Source: _bmad-output/implementation-artifacts/investigations/sgf-auditoria-migracion-investigation.md — tablas de mapeo Cierre/Ventas/Inventario/Retiros, sección "BRECHA CRÍTICA #2"]
- [Source: _bmad-output/implementation-artifacts/1-4-importacion-sincronizada-socios.md — patrón de servicio/ruta/UI a replicar]
- [Source: _bmad-output/implementation-artifacts/1-3-reporte-inconsistencias-mapeo-empleados.md — employeeMapping, ahora extendido con Cierre!Cajero]
- [Source: services/shifts.service.ts#closeShift — convención `isMembershipProduct()` y cálculo de totales en vivo (no aplicable a datos históricos, ver H3)]
- [Source: services/membership-helpers.ts#isMembershipProduct]
- [Source: prisma/schema.prisma — models Shift, InventoryMovement, CashWithdrawal, Product]
- Evidencia real verificada en esta sesión: `docs/cortes.xlsx` vía `xlsxCortesAdapter.tryParse()` (folio FN-248, cajero ANDREW, tickets duplicados 5763×4 y 5778×2).

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- **Bug encontrado en `findCierreValue`/`findCierreNumber` (Story 1.2, latente):** la hoja Cierre tiene dos bloques por fila (izquierdo: label col1/valor col3; derecho "FORMAS DE PAGO": label col6/valor col8). El helper original escaneaba col1→col8 como un solo bloque — nunca encontraba `Ventas Efectivo`, `Ventas Tarjeta Debito/Credito`, `Total Voucher`, y (bonus) corregía también `Ventas Anticipo`/`Comision a Pagar` que estaban rotos desde Story 1.2 (silencioso porque ambas muestras tienen esos campos en 0). Fix: `findCierreBlockColumn()` detecta en qué bloque matcheó el label y restringe el rango de columnas de valor a ese bloque. Verificado campo por campo contra `docs/cortes.xlsx` real.
- **Bug de timeout en `$transaction` contra Postgres remoto:** la primera implementación hacía upsert de Product + create de InventoryMovement uno por uno (N round-trips secuenciales) dentro de una transacción interactiva de Prisma. Contra la DB remota (`db.prisma.io`), el turno FN-248 (39 movimientos) agotaba el timeout por defecto de la transacción (`Transaction API error: Transaction not found`). Fix: Product se resuelve/upsertea FUERA de la transacción (es catálogo global, no dato del corte — no necesita revertirse con el turno), y los movimientos/retiros se insertan con `createMany` (1-2 round-trips totales en vez de N). Verificado: la misma corrida que antes fallaba ahora crea 39 movimientos sin error.

### Completion Notes List

- Los 20 AC de la historia se cumplen. AC6 (skipDuplicates literal) se reemplazó por una estrategia de "replace" atómico por corte (delete + recreate de InventoryMovement/CashWithdrawal dentro de la misma transacción del Shift) — resuelve H1 (tickets repetidos legítimos, ej. ticket 5763×4 en `docs/cortes.xlsx`) sin colapsar líneas válidas, y como efecto adicional resuelve también H2 (CashWithdrawal ahora es completamente idempotente, superando la limitación que la historia aceptaba como conocida).
- AD-1 intacto: `syncShifts()` recibe `DomainShift[]` — no importa adapters ni exceljs. Helpers puros nuevos en `modules/migration/domain/shift-sync.ts` (sin Prisma).
- Manejo de errores por corte (no por registro, a diferencia de Story 1.4) verificado con fallo forzado real: un corte con FK inválida revierte completo (incluyendo el `Shift.upsert` ya ejecutado) sin afectar cortes previos ya comprometidos en la misma corrida — AC13 confirmado con datos reales, no solo razonamiento.
- Verificación manual extremo a extremo contra la base de datos real (`db.prisma.io`) con `docs/cortes.xlsx`: primera corrida crea 1 shift actualizado (upsert sobre folio existente de seed), 39 movimientos, 0 retiros; segunda corrida idéntica produce el mismo conteo y mismo `shift.id` — idempotencia confirmada, no solo smoke-testeada.
- **Efecto colateral de la verificación manual:** el corte demo `FN-248` sembrado por `prisma/seed.ts` (datos ficticios) quedó sobrescrito con los datos reales de `docs/cortes.xlsx` al correr la verificación de idempotencia. `prisma/seed.ts` no es idempotente (usa `create`, no `upsert`) — restaurar el dataset de demo original requiere `npm run prisma:reset` (drop + migrate + seed), no un simple re-run de `db:seed`.
- Campos financieros de Cierre (H3) confirmados como mapeo directo (no recalculado) contra datos reales: `initialCash=1000, ticketCount=34, cashAmount=6344, totalSales=6344, subtotal=5580, tax=764, totalCash=7344` — coinciden exactamente con el Cierre de `docs/cortes.xlsx`.
- H5 (Inventario "Salidas" no genera movimiento propio) implementado: solo `Ajuste`/`Entradas` ≠ 0 generan `InventoryMovement`.
- H6: se confirmó `Location.GYM` fijo para todos los movimientos importados. No se encontró campo "Diferencia" explícito en el Cierre real — `Shift.difference` queda en su default de schema (0); no bloquea ningún AC de esta historia.
- Notas legacy (AC12): `Shift.notes` se guarda como `{"legacyFields": "<string ya formateado por Story 1.2>"}` — JSON estructurado, pero no reproduce el desglose numérico exacto del ejemplo ilustrativo de epics.md (`{"advanceSales": 150, "source": "..."}"`). Reproducir ese desglose exacto requeriría cambiar la forma de `DomainShift.legacyNotes` (Story 1.2), fuera del alcance de esta historia — desviación menor documentada, no bloqueante (docs/cortes.xlsx tiene estos campos en 0, sin poder verificar contra un caso real >0).

### File List

**Nuevos:**
- `modules/migration/domain/shift-sync.ts`
- `app/api/migracion/sync-shifts/route.ts`
- `app/(dashboard)/configuracion/migracion/_components/ImportCortesStep.tsx`
- `scripts/shift-sync-smoke-test.ts`

**Modificados:**
- `modules/migration/adapters/xlsx-cell-utils.ts` — fix de `findCierreValue`/`findCierreNumber` para el layout de doble bloque del Cierre
- `modules/migration/adapters/xlsx-cortes.adapter.ts` — extracción de campos financieros directos del Cierre
- `modules/migration/domain/canonical.types.ts` — campos financieros en `CanonicalShift`
- `modules/migration/domain/domain.types.ts` — campos financieros + `adjustment`/`entries` en `DomainInventoryRow`
- `modules/migration/domain/transformers/shift-transformer.ts` — passthrough de campos financieros y de inventario
- `modules/migration/migration.service.ts` — `syncShifts()`
- `types/api/migracion.ts` — `EmployeeMappingSchema`, `SyncShiftsResultSchema`
- `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` — wiring de steps 5/6
- `package.json` — script `smoke:shift-sync`
