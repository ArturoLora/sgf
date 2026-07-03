# Bloqueo de employeeMapping — Reconstruction histórica (docs/2026)

**Fecha:** 2026-07-03
**Estado:** Bloqueado — pendiente de decisión humana. Reconstruction NO se ejecutó.
**Alcance:** Únicamente el mapeo de Cajero (`employeeMapping`) requerido por `syncShifts()` sobre el lote validado de `docs/2026/` (243 `.xlsx`: 242 cortes + 1 socios).

## Hand-off Brief

El preflight completo de Reconstruction (TypeScript, `smoke:parsers` 78/78, `analyzeFiles`/`previewFiles` sobre los 243 `.xlsx`) pasó en verde: 242 cortes, 1 socios, 652 socios, 0 errores, 0 folios duplicados, únicamente los 2 warnings ya aceptados (`UNKNOWN_MEMBERSHIP` fila 96, `UNKNOWN_PAYMENT_METHOD` FN-279/ticket 5928). Sin embargo, `syncShifts()` requiere que cada `Cajero` de los 242 cortes resuelva a un `User.id` real vía `employeeMapping`; el auto-mapeo por nombre exacto (case-insensitive) solo resuelve 3 de los 8 nombres históricos, porque la tabla `User` real solo contiene 3 empleados (`Nacho`, `Carlos`, `Andrew`). Esto dejaría sin mapeo a 3 cajeros históricos que en conjunto cubren 122 de 242 turnos (50%), y cada turno sin cajero mapeado falla la importación completa (no es una advertencia). Ante esto, y siguiendo el mismo criterio aplicado a D/Z y `TRANSF. ELECTRONICA` (no inventar equivalencias de negocio sin evidencia), se detuvo la ejecución y se preguntó al usuario. El usuario confirmó: **no ejecutar Reconstruction hoy, no inventar ni aproximar el mapeo, no crear Users automáticamente.**

## Evidencia confirmada

- `modules/migration/migration.service.ts:218-223` (`syncShifts`): si `shift.cashierName` no tiene entrada en `employeeMapping`, lanza `Cajero '<nombre>' sin mapeo resuelto` y ese shift completo se cuenta como fallido (`shiftsFailed++`), sin afectar el resto del batch pero sin importarse tampoco.
- `modules/migration/domain/inconsistency-classifier.ts:4-43` (`classifyInconsistencies`): mapea `sellerNames`/`cashierNames` a `User` por coincidencia exacta de `name` (case-insensitive, `trim().toUpperCase()`); `canProceed = totalBlocking === 0`, es decir el flujo real (vía UI) exige que el operador resuelva manualmente cualquier nombre sin auto-mapeo antes de continuar.
- A nivel de venta individual (no de turno), un `sellerName` sin mapeo NO bloquea: `userId: sale.sellerName ? employeeMapping[sale.sellerName] ?? cashierId : cashierId` (`migration.service.ts:256`) cae de vuelta al cajero del turno. El bloqueo real es únicamente a nivel `Cajero` (turno completo).

### Users reales en DB (confirmado 2026-07-03)

| name | role | isActive |
|---|---|---|
| Nacho | ADMIN | true |
| Carlos | EMPLEADO | true |
| Andrew | EMPLEADO | true |

### sellerNames/cashierNames del lote (8 total, vía `previewFiles()`)

`ADMINISTRADOR, ALICIA ACEVEDO, ANDREW, ANGELICA, CARLOS, GAEL, GAEL GARCIA PEREZ, NACHO`

### Desglose real por Cajero (242 turnos, vía `previewFiles()`)

| Cajero histórico | Turnos | ¿Auto-mapea a User real? |
|---|---|---|
| CARLOS | 118 | ✅ Carlos |
| GAEL GARCIA PEREZ | 90 | ❌ sin mapeo |
| ALICIA ACEVEDO | 25 | ❌ sin mapeo |
| ADMINISTRADOR | 7 | ❌ sin mapeo |
| ANDREW | 1 | ✅ Andrew |
| NACHO | 1 | ✅ Nacho |

**Total bloqueado: 122 de 242 turnos (50%)** fallarían la importación con el auto-mapeo tal cual, si Reconstruction se ejecutara sin resolver estos 3 nombres.

### sellerNames a nivel de venta individual (no bloquean, solo contexto)

`CARLOS: 556, GAEL: 1, NACHO: 3, ANGELICA: 1` — ventas con vendedor explícito entre paréntesis en Forma de Pago; el resto de ventas no tiene `sellerName` (cae al cajero del turno).

## Por qué no se resolvió automáticamente

No existe evidencia en código ni en los Excel para determinar con certeza a qué `User` real corresponde `GAEL GARCIA PEREZ`, `ALICIA ACEVEDO` o `ADMINISTRADOR` (p. ej. si son alias/nombres completos de empleados actuales, empleados que ya no trabajan ahí, o una cuenta genérica de mostrador). Asumir una equivalencia (p. ej. `ADMINISTRADOR` → `Nacho` por ser el único ADMIN) sería inventar una asociación de negocio sin confirmación humana — mismo criterio aplicado previamente a D/Z (`sgf-auditoria-migracion-investigation.md`) y a `TRANSF. ELECTRONICA` (`warnings-pre-reconstruccion-investigation.md`).

## Decisión del usuario (2026-07-03)

Detener Reconstruction en esta corrida. No mapear `GAEL GARCIA PEREZ`, `ALICIA ACEVEDO` ni `ADMINISTRADOR` a `Nacho`/`Carlos`/`Andrew` sin confirmación humana explícita. No crear `User`s automáticamente.

## Estado de la DB

**Sin cambios.** No se ejecutó backup, `deleteOperationalData`, `resetProducts` ni `executeReconstruction`. No hubo escrituras destructivas ni de ningún tipo contra la base de datos de desarrollo. El preflight fue enteramente de solo lectura (`analyzeFiles`, `previewFiles`, consulta de `User` vía `findMany`).

## Próximo paso sugerido (no ejecutado)

Antes de una futura corrida de Reconstruction autorizada, resolver con el dueño del gimnasio (o vía consulta directa a quien administró la caja) a qué empleado real corresponde cada uno de los 3 nombres pendientes, o decidir explícitamente si deben tratarse como turnos sin atribución de cajero resuelto (lo cual actualmente no es soportado por `syncShifts()` — requeriría un cambio de comportamiento fuera del alcance de este análisis).

## Resolución humana (2026-07-03, follow-up)

El responsable del proyecto confirmó identidad real de los 3 nombres pendientes:

- `GAEL GARCIA PEREZ` — era empleado/cajero real (no es alias de ningún User existente).
- `ALICIA ACEVEDO` — era empleada/cajera real (no es alias de ningún User existente).
- `ADMINISTRADOR` — corresponde a Nacho.

Decisión: Gael y Alicia conservan identidad histórica propia mediante `User.id` propios (creados vía la infraestructura real de Story 3.3, `isActive=false` vía Story 3.4 — no son empleados activos hoy, solo se preserva autoría histórica de Migración). `ADMINISTRADOR` mapea al `User.id` real de Nacho. Con esto, `employeeMapping` queda completo (8/8 nombres resueltos) y el bloqueo documentado arriba queda resuelto. Ejecución de Reconstruction continúa en la misma sesión de trabajo.
