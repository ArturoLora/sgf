# Investigation: Mapeo de empleados — autoría histórica sin User activo

## Hand-off Brief

1. **Qué pasa.** El mapeo visual reportado (`ALICIA ACEVEDO → Andrew`, `ANGELICA → Andrew`) NO es un bug de auto-mapeo por fuzzy-matching ni un bug de `<select>` no controlado — ambas hipótesis quedan **Refutadas** por código. La causa real, **Confirmada**: `GET /api/migracion/users` (`app/api/migracion/users/route.ts:12`) filtra `where: { isActive: true }`. Alicia y Angélica SÍ tienen `User` reales, con `name` que coincide exactamente con el nombre histórico (`ALICIA ACEVEDO`, `ANGELICA`) — pero ambas tienen `isActive: false` (decisión deliberada, ver investigación previa `employee-mapping-bloqueo-reconstruction-investigation.md`). El filtro las excluye de la lista que llega al clasificador Y al `<select>` — no solo falla el auto-mapeo, es **imposible seleccionarlas manualmente** en cualquier corrida futura del wizard. El admin, forzado por el gate `canProceed` a resolver el mapeo para continuar, seleccionó manualmente a Andrew para ambas — perdiendo la atribución histórica real sin que el sistema lo advierta.
2. **Dónde está el caso.** Confirmado en 4 puntos: filtro `isActive:true` en `/api/migracion/users`, clasificador de auto-mapeo exacto sin fallback (`inconsistency-classifier.ts`), esquema Prisma sin columna de nombre histórico en `Shift`/`InventoryMovement`/`CashWithdrawal` (autoría se pierde para siempre al escribir), y el `<Select>` (Radix, controlado) que muestra placeholder — no el primer usuario — cuando no hay mapeo, refutando la hipótesis de bug visual.
3. **Qué sigue.** Requiere decisión de producto entre Opción A (conservar histórico sin User — requiere migración Prisma) y Opción B (empleado histórico inactivo — ya usado con éxito en este proyecto, cero cambio de schema). Recomendación: **B para el caso ya resuelto + fix del filtro `isActive` para que sea sostenible en corridas futuras**. Ruta sugerida: `/bmad-create-story` → `/bmad-dev-story` (no es fix trivial — toca contrato de API, UI y hay una decisión de producto explícita que documentar).

## Case Info

| Field | Value |
|---|---|
| Ticket | N/A — reporte visual directo del wizard en producción |
| Date opened | 2026-07-09 |
| Status | Concluded — causa raíz Confirmada, recomendación entregada, sin implementar |
| System | Wizard de Migración/Reconstruction, módulo `employeeMapping` |
| Evidence sources | Código fuente (`InconsistencyStep.tsx`, `inconsistency-classifier.ts`, `migration.service.ts`, `reconstruction.service.ts`, `types/api/migracion.ts`, `prisma/schema.prisma`, `users.service.ts`, `components/ui/select.tsx`), consulta de solo lectura contra la DB real (`User` — sin escritura), investigación previa `employee-mapping-bloqueo-reconstruction-investigation.md` |

## Problem Statement

El wizard de Migración/Reconstruction detecta nombres históricos de cajero/vendedor (`sellerNames`) y los mapea a `User` reales antes de permitir continuar. Casos observados en producción muestran `ALICIA ACEVEDO → Andrew` y `ANGELICA → Andrew` — nombres sin coincidencia clara terminando aparentemente asociados a un usuario existente, sin que la UI ofrezca conservar el nombre histórico sin usuario, dejarlo pendiente explícitamente, o crear un empleado nuevo desde el flujo. Se investiga la semántica real de `employeeMapping` y el flujo mínimo correcto.

## Confirmed Findings

### Finding 1: `employeeMapping` es `Record<string,string>` — mapa nombre histórico → `User.id`, sin soporte para "sin asignar"

**Evidencia:** `types/api/migracion.ts` — `EmployeeMappingSchema = z.record(z.string(), z.string())`. Un valor debe ser un `string` no vacío una vez presente; **no existe una tercera opción** (`null`, `"__NONE__"`, etc.) en el contrato — la única forma de "no mapear" es que la clave esté simplemente ausente del objeto.

**Detalle:** `InconsistencyStep.tsx:82-91` (`handleUserSelect`) confirma esto en el cliente — seleccionar "Sin asignar" (`value="__CLEAR__"`) **elimina la clave** (`delete next[historicalName]`) en vez de escribir un valor vacío. Un valor `""`/`null` literal **no puede sobrevivir** hasta el backend: si sobreviviera, `EmployeeMappingSchema.safeParse` en `sync-shifts/finalize`/`reconstruccion/ejecutar/finalize` (post-Story de batching) rechazaría la request completa con `400` antes de tocar cualquier función de negocio — confirmado por el tipo del esquema (`z.string()`, no `.nullable()`).

### Finding 2: auto-mapeo es coincidencia exacta case-insensitive, sin fuzzy matching, sin fallback

**Evidencia:** `modules/migration/domain/inconsistency-classifier.ts:9-19` — `usersByNormalizedName = new Map(users.map(u => [u.name.trim().toUpperCase(), u]))`, luego `usersByNormalizedName.get(name.trim().toUpperCase()) ?? null`. Sin distancia de edición, sin substring, sin ningún candidato "más parecido". Si no hay coincidencia exacta: `resolvedUserId: null`, `isAutoMapped: false`.

**Detalle:** Refuta explícitamente la hipótesis de fuzzy matching (§2 del pedido) — no existe en el código.

### Finding 3: `GET /api/migracion/users` excluye usuarios inactivos — la causa raíz real

**Evidencia:** `app/api/migracion/users/route.ts:11-15`:
```ts
const users = await prisma.user.findMany({
  where: { isActive: true },
  select: { id: true, name: true, email: true },
  orderBy: { name: "asc" },
});
```
Este es el ÚNICO origen de la lista `users` que llega a `classifyInconsistencies()` (`InconsistencyStep.tsx:35-40`) y al `<Select>` (`InconsistencyStep.tsx:168-172`, `{users.map(u => <SelectItem>...)}`).

**Detalle — confirmado contra la DB real (solo lectura):**

| name | email | role | isActive |
|---|---|---|---|
| ALICIA ACEVEDO | alicia.historico@nachogym.local | EMPLEADO | **false** |
| ANGELICA | angelica.historico@nachogym.local | EMPLEADO | **false** |
| Andrew | andrew@nachogym.com | EMPLEADO | true |
| Carlos | carlos@nachogym.com | EMPLEADO | true |
| GAEL GARCIA PEREZ | gael.historico@nachogym.local | EMPLEADO | true |
| Nacho | nacho2@nachogym.com | ADMIN | true |

`ALICIA ACEVEDO` y `ANGELICA` **YA EXISTEN** como `User` con `name` idéntico byte-a-byte al `sellerName` histórico — el auto-mapeo por nombre exacto **funcionaría perfectamente** si esos dos registros llegaran a `classifyInconsistencies()`. No llegan, porque `isActive:false` los excluye en el `WHERE` de la consulta. `GAEL GARCIA PEREZ` (isActive:true) sí llega y sí auto-mapea correctamente — es el control que aísla la variable: la única diferencia entre "Gael se mapea bien" y "Alicia/Angélica no" es el flag `isActive`.

**Por qué son `isActive:false`:** decisión deliberada documentada en `employee-mapping-bloqueo-reconstruction-investigation.md:70` — creados vía la infraestructura real de Story 3.3 específicamente para preservar autoría histórica de Migración, marcados inactivos vía Story 3.4 porque no son empleados activos hoy.

### Finding 4: el `<Select>` es Radix controlado — no hay bug de "primer `<option>` visual"

**Evidencia:** `components/ui/select.tsx` es un wrapper directo de `@radix-ui/react-select`, sin lógica propia de matching. `InconsistencyStep.tsx:157-167`: `<Select value={resolvedId ?? ""}>` con un único `<SelectItem value="__CLEAR__">Sin asignar</SelectItem>` — **ningún** `SelectItem` tiene `value=""`. Radix `Select.Value` muestra su `placeholder` cuando el `value` del `Select.Root` no coincide con ningún `Item` registrado (comportamiento documentado de Radix, no un hack de este proyecto) — no existe el comportamiento de `<select>` nativo no controlado de "mostrar visualmente la primera opción cuando el valor no coincide".

**Detalle:** Refuta explícitamente la hipótesis de bug visual de `<select>` (§2 del pedido). Para un `historicalName` sin mapeo, la UI muestra el placeholder `"Seleccionar usuario…"` — no "Andrew" — hasta que alguien selecciona algo. La atribución a Andrew observada en producción es necesariamente una **selección manual** hecha por quien operó el wizard (forzado por el gate `canProceed`, sin la opción correcta disponible), no un default automático del sistema.

### Finding 5: la clave única de negocio es `cashierId`/`userId` (FK a `User`) — sin columna de nombre histórico en ninguna entidad afectada

**Evidencia (Prisma schema real):**

| Entidad | Campo de autoría | Tipo | Nullable | FK `onDelete` | Nombre histórico persistido |
|---|---|---|---|---|---|
| `Shift` | `cashierId` (`prisma/schema.prisma:226`) | `String` | **No** | sin especificar (Restrict/NoAction por default de Prisma) | **No existe** columna para ello |
| `InventoryMovement` | `userId` (`prisma/schema.prisma:192`) | `String` | **No** | sin especificar | **No existe** |
| `CashWithdrawal` | `userId` (`prisma/schema.prisma:265`) | `String` | **No** | sin especificar | **No existe** |

**Detalle:** `Shift.notes` (`String?`, nullable) es el único campo de texto libre en `Shift`, pero `buildShiftUpsertData` (`modules/migration/domain/shift-sync.ts:43,70,94`) solo lo usa para `legacyNotes` (campos legacy sin equivalente de negocio, ej. D/Z) — **nunca** para el nombre crudo del cajero/vendedor. Confirmado con `grep` sobre `shift-sync.ts`: cero referencias a `cashierName` fuera del parámetro de entrada.

**Consecuencia irreversible:** una vez que `syncShifts()`/`executeReconstruction()` escribe un `Shift`/`InventoryMovement`/`CashWithdrawal` con un `cashierId`/`userId` — correcto o incorrecto — el nombre histórico original (`"ANGELICA"`) **se pierde permanentemente**. No hay ningún lugar en el esquema actual de donde recuperarlo después del hecho. Los `Shift`/movimientos de Angélica y Alicia ya sincronizados con `cashierId`/`userId` = Andrew **ya perdieron la atribución real** — esto no es reversible por consulta, solo por re-importar desde los `.xlsx` originales con el mapeo corregido.

### Finding 6: la UI de reportes hace `join` en vivo contra `User.name` — nunca lee un nombre histórico persistido

**Evidencia:** `services/shifts.service.ts:256,378,429,452,497,550,568,583` y `services/reports.service.ts:259,298` — todos usan `cashier: { select: { name: true } }` (relación Prisma, `include`/`select`), nunca un campo propio de texto en `Shift`.

**Detalle:** Confirma Finding 5 desde el lado de lectura — el nombre mostrado en Historial de Ventas/Cortes es siempre el `User.name` ACTUAL en el momento de la consulta, vía relación, nunca un snapshot histórico. Si el `name` de un `User` cambiara después, el historial completo "cambiaría" retroactivamente en la UI — comportamiento ya existente, no introducido por este hallazgo, mencionado aquí porque es relevante para entender el modelo.

### Finding 7: la escritura NO valida `isActive` ni `role` del `userId` resuelto — solo la FK

**Evidencia:** `migration.service.ts:218-223` (cajero) y `:256` (vendedor de venta) solo verifican que `cashierId`/`userId` sea un string truthy — ningún chequeo de `isActive` o `role` en `syncShifts()`, `buildShiftUpsertData`, ni en las funciones de dominio. El único gate real es la FK de Postgres al momento del `INSERT`/`UPDATE`.

**Detalle:** Esto significa que **si** Alicia/Angélica pudieran seleccionarse en el dropdown (si no estuvieran filtradas), sus `Shift`/movimientos se escribirían exitosamente con su `User.id` real pese a `isActive:false` — el problema NO está en la capa de escritura, está 100% en la capa de lectura de candidatos (`/api/migracion/users`) y en el clasificador que consume esa lista filtrada.

### Finding 8: `executeReconstruction()` reutiliza `syncShifts()` sin lógica propia de mapeo

**Evidencia:** `modules/migration/reconstruction.service.ts:356` — `shiftsResult = await syncShifts(shifts, employeeMapping)`. Mismo código, mismo comportamiento, para Sync y Reconstruction — no hay una segunda implementación a auditar.

### Finding 9: creación de empleado histórico ya tiene un flujo real y probado — `createEmployee()` (Story 3.3)

**Evidencia:** `modules/users/users.service.ts:116-165` — `createEmployee(input)`:
- Requiere `email` (único, real, formato válido — usado por Better Auth), `password` (real, hasheado vía `auth.api.createUser`), `name`, `role` (`ADMIN`/`EMPLEADO`).
- `phone`/`notes` opcionales — se completan con un `prisma.user.update()` inmediato posterior (limitación documentada del adapter de Better Auth, `users.service.ts:95-115`).
- **`isActive: true` se fuerza explícitamente** (`users.service.ts:155`) en la creación — activar/desactivar es un paso posterior, vía Story 3.4 (`setEmployeeActive` o equivalente), no parte de `createEmployee()`.
- Rollback de mejor esfuerzo: si el `update()` post-creación falla, borra el `User` recién creado (`users.service.ts:159-164`) — creación todo-o-nada desde la perspectiva del admin.
- **Ya usado exitosamente para este exacto propósito:** los emails `alicia.historico@nachogym.local`, `angelica.historico@nachogym.local`, `gael.historico@nachogym.local` (dominio `.local`, claramente sintético, no un correo real de la persona) confirman que este patrón — email ficticio + password real pero nunca comunicado + `isActive` ajustado después — ya se ejecutó en producción para resolver exactamente este problema, dos veces (al menos Alicia+Gael documentados en la investigación previa; Angélica sin documentar pero con el mismo patrón de email en la DB real).

**Detalle:** No existe endpoint/acción para crear un empleado directamente desde `EmployeeMappingStep`/`InconsistencyStep` — hoy este flujo se opera manualmente desde `/usuarios` en una sesión separada, ANTES de la corrida del wizard (confirmado por la secuencia narrada en la investigación previa: "creados... Ejecución de Reconstruction continúa en la misma sesión de trabajo" — la creación ocurrió primero, fuera del wizard).

## Deduced Conclusions

### Deducción 1: la atribución `→ Andrew` es una elección manual forzada, no un default del sistema

**Basado en:** Finding 3 (Alicia/Angélica invisibles en la lista de candidatos) + Finding 4 (el `<Select>` muestra placeholder, no un valor por defecto) + el gate `canProceed = totalBlocking === 0` (`InconsistencyStep.tsx:76-80`, `inconsistency-classifier.ts:29,41`) que bloquea "Continuar" hasta que TODAS las entradas tengan un valor.

**Razonamiento:** Sin Alicia/Angélica como opciones válidas, y sin poder avanzar sin resolver el 100% de los `sellerNames`, quien operó el wizard tuvo que elegir activamente alguno de los 4 usuarios activos disponibles (Andrew, Carlos, GAEL GARCIA PEREZ, Nacho) para cada una — y elegió Andrew para ambas. El sistema no fuerza "Andrew" específicamente; fuerza *alguna* elección entre las opciones visibles, todas incorrectas para este caso.

**Confianza: Alta** — la mecánica que hace la elección *incorrecta* inevitable está 100% confirmada en código; la elección *específica* de Andrew es un dato de comportamiento humano fuera del alcance de lo verificable por código, pero irrelevante para la causa raíz del defecto.

### Deducción 2: el defecto es recurrente, no un incidente aislado ya cerrado

**Basado en:** Finding 3 combinado con el hecho de que Alicia y Angélica **siguen existiendo** como `User` `isActive:false` — la corrección aplicada en la investigación previa (crearles cuentas) resolvió el bloqueo de **esa corrida específica** (`canProceed` se satisfizo porque en ALGÚN momento de esa sesión alguien las seleccionó — probablemente correctamente en ese momento, o el flujo permitió mapear antes de desactivarlas), pero el filtro `isActive:true` en `/api/migracion/users` garantiza que **cualquier corrida futura** (otro Sync incremental, otra Reconstruction) que vuelva a ver `"ALICIA ACEVEDO"` o `"ANGELICA"` como `sellerName` repetirá el mismo problema — las cuentas ya no son seleccionables una vez desactivadas.

**Confianza: Alta** — verificado directamente: el filtro es incondicional, no depende de si el usuario "ya se usó antes" en Migración.

## Answers — puntos 1, 2 y 4 del pedido

**§1 (semántica actual de `employeeMapping`):** `Record<string,string>` cliente→servidor; clave = `sellerName` histórico exacto (string tal cual aparece en el Excel); valor = `User.id` real, obligatorio si la clave está presente; **ausencia de clave = no mapeado** (no hay estado explícito "sin asignar" con valor propio). Auto-mapeo inicial: coincidencia exacta case-insensitive contra `User.name`, restringido a usuarios `isActive:true`. Sin match → `resolvedUserId:null`, badge "Requiere mapeo", bloquea `Continuar`. La API (`EmployeeMappingSchema`) asume — y en el nuevo flujo `stage`/`finalize` de la Story de batching, exige por Zod — que todo valor presente es un string no vacío; nunca llega `null`/`undefined` como valor de una clave existente.

**§2 (causa raíz del mapeo aparentemente incorrecto):** Ver Finding 3 + Finding 4 + Deducción 1. **No** hay fuzzy matching. **No** hay fallback automático al primer usuario. **No** es un bug de `<select>` no controlado. **Es** un filtro `isActive:true` en el endpoint que alimenta candidatos, combinado con una selección manual forzada por el gate de bloqueo, sobre `User`s reales que ya tienen el nombre exacto correcto pero están inactivos.

**§4 (simulación `EMPLEADO HISTORICO XYZ`, sin ejecutar nada):**

| Caso | Resultado |
|---|---|
| A) sin key en `employeeMapping` | `cashierId` (o `userId` de venta) = `undefined` → `!cashierId` verdadero → `throw` → capturado por el `try/catch` por-turno (`migration.service.ts:213-354`) → `shiftsFailed++`, error `"Cajero 'EMPLEADO HISTORICO XYZ' sin mapeo resuelto..."` — el turno completo se omite, resto del batch continúa. Para venta individual: cae a `cashierId` del turno (línea 256) — no bloquea, pero atribuye al cajero del turno, no al vendedor real. |
| B) key con `""` | Idéntico a A — `""` es falsy, mismo `throw`, mismo resultado. |
| C) key con `null` | **No alcanzable** — `EmployeeMappingSchema` (`z.record(z.string(), z.string())`) rechaza la request completa con `400` antes de llegar a `syncShifts`/`finalizeSyncMode`/`executeReconstruction` (confirmado por el tipo del esquema; en el flujo `stage`/`finalize` post-batching, `safeParse` corre antes de cualquier lógica de negocio). |
| D) key apunta a `userId` inexistente | Pasa el chequeo `!cashierId` (string truthy) → falla en el `INSERT`/`UPDATE` de Postgres por violación de FK → excepción capturada por el mismo `try/catch` por-turno → `shiftsFailed++`, mensaje de error crudo de Prisma/Postgres (no un mensaje de negocio claro) — el turno se omite, no corrompe datos, pero el mensaje es peor que el de A/B. |
| E) key apunta a usuario real pero `isActive:false` | **Funciona sin error** — nada en la capa de escritura valida `isActive` (Finding 7). El turno se importa correctamente con la atribución histórica real. (Esto es precisamente lo que HOY es imposible lograr porque la UI nunca ofrece ese `userId` como opción — el bug está antes de llegar aquí.) |
| F) key apunta a `ADMIN` | Funciona igual que cualquier otro `userId` válido — sin caso especial para rol (confirmado, `ADMINISTRADOR → Nacho` ya en producción). |
| G) dos `sellerNames` apuntan al mismo `User` | Permitido sin ninguna advertencia — múltiples identidades históricas se fusionan silenciosamente bajo un mismo `User.id`. Exactamente el patrón ya ocurrido (`ALICIA ACEVEDO` y `ANGELICA`, ambas → Andrew). |

## Source Code Trace

- **Error origin (causa raíz):** `app/api/migracion/users/route.ts:12` (`where: { isActive: true }`).
- **Trigger:** cualquier `sellerName` histórico cuyo `User` correspondiente exista pero tenga `isActive:false`.
- **Condition:** el admin debe resolver manualmente el mapeo (gate `canProceed`) sin que la opción correcta esté disponible en el `<Select>`.
- **Related files:** `app/api/migracion/users/route.ts`, `app/(dashboard)/configuracion/migracion/_components/InconsistencyStep.tsx`, `modules/migration/domain/inconsistency-classifier.ts`, `modules/migration/migration.service.ts` (líneas 218-223, 256), `modules/migration/reconstruction.service.ts:356`, `types/api/migracion.ts` (`EmployeeMappingSchema`), `prisma/schema.prisma` (`Shift.cashierId`, `InventoryMovement.userId`, `CashWithdrawal.userId`), `modules/users/users.service.ts` (`createEmployee`).

## §3 — Capacidad del modelo: ¿podemos representar autoría histórica sin `User`?

| Entidad | ¿Nombre histórico persistido HOY? | ¿Requiere `User`? | ¿Posible sin `User` sin cambio de schema? |
|---|---|---|---|
| `Shift` | No | Sí (`cashierId String`, no-nullable) | **NO** |
| `InventoryMovement` | No | Sí (`userId String`, no-nullable) | **NO** |
| `CashWithdrawal` | No | Sí (`userId String`, no-nullable) | **NO** |

**Conclusión global: NO.** El esquema actual **no puede** representar "ALICIA ACEVEDO fue la cajera histórica, pero no tiene cuenta SGF" sin crear un `User`. Los tres FKs son obligatorios (no-nullable) y no existe ninguna columna paralela de texto para un nombre histórico independiente. Cualquier solución que NO cree un `User` (Opción A) requiere necesariamente una migración Prisma — no es una limitación de la UI o del backend actual, es estructural.

## §5 — Comparación de opciones (contra el modelo real)

### Opción A — Conservar como histórico sin `User`

- **¿Posible con schema actual?** No (Finding 5/§3 arriba). Requiere: (1) volver nullable `Shift.cashierId`, `InventoryMovement.userId`, `CashWithdrawal.userId`, o (2) agregar columnas paralelas (`cashierHistoricalName String?`, etc.) y decidir cuál gana en la UI cuando ambos existen.
- **Migración Prisma:** Sí, obligatoria.
- **Cambios adicionales:** tipos de dominio (`DomainShift`/`DomainSale`/`DomainWithdrawal` ganan un campo), `buildShiftUpsertData`/`buildSaleMovementData`/`buildWithdrawalData` (deben aceptar ausencia de `userId`), TODA consulta que hace `include: {cashier: ...}`/`{user: ...}` en reportes (Finding 6) para mostrar el nombre histórico cuando no hay `User`, y la UI de Historial de Ventas/Cortes.
- **Impacto:** el más amplio de las tres opciones — toca capa de dominio, Prisma, y reportes existentes que hoy asumen `cashier`/`user` siempre resuelve a un `User` real.

### Opción B — Crear empleado histórico inactivo

- **Ya implementado y probado en este proyecto** (Finding 9) — cero cambio de schema, cero riesgo nuevo de tipos.
- **Campos obligatorios:** `email` (único — usar un dominio sintético como ya se hizo, ej. `*.historico@nachogym.local`), `password` (real, hasheado, nunca comunicado a la persona — técnicamente aceptable porque nadie necesita loguearse con esa cuenta), `name` (= nombre histórico exacto, para que el auto-mapeo futuro funcione), `role` (`EMPLEADO`).
- **Riesgo de cuentas basura:** bajo si se sigue la convención de nombre/email ya usada (`*.historico@*.local`) — permite distinguir estas cuentas de empleados reales a simple vista; sin esa convención, sí hay riesgo de confusión en `/usuarios`.
- **Reactivación posterior:** técnicamente trivial vía Story 3.4 (`isActive` es un toggle simple) — si la persona vuelve a trabajar ahí, no hay obstáculo.
- **Mezcla identidad histórica con acceso/autenticación:** Sí, inherente a la opción — un `User` en SGF es simultáneamente "una identidad" y "una credencial de acceso". No hay forma de separar eso sin la Opción A.

### Opción C — Dejar pendiente y bloquear continuar

- **Ya es el comportamiento actual** (`canProceed` ya bloquea sin mapeo) — el problema NO es que falte bloqueo, es que el `<Select>` no ofrece la opción CORRECTA para completarlo. Bloquear más no resuelve nada por sí solo.
- **Ex-empleados sin cuenta:** con el filtro `isActive:true` actual, C **fuerza** crear un usuario "artificial" (activo o no) tarde o temprano, porque no hay tercera vía — exactamente el problema reportado.

## Recomendación

### Causa raíz
`GET /api/migracion/users` filtra `isActive:true`, excluyendo `User`s creados específicamente para preservar autoría histórica de Migración. El auto-mapeo y el `<Select>` nunca ven esos candidatos; el admin, bloqueado por el gate de completitud, selecciona manualmente otro usuario activo — perdiendo la atribución real de forma permanente (Finding 5).

### Semántica actual
`employeeMapping: Record<sellerNameHistórico, User.id>` — obligatorio por clave presente, sin estado "histórico sin usuario", auto-mapeo exacto restringido a usuarios activos.

### Capacidad del modelo
NO — el schema actual exige un `User.id` real y no-nullable en las 3 entidades afectadas. Preservar autoría sin `User` es estructuralmente imposible sin migración Prisma.

### Opción recomendada
**B, combinada con un fix al filtro de candidatos** (no es "B pura" — B sin el fix del filtro solo resuelve el caso ya vivido, no previene la recurrencia documentada en Deducción 2). Fix mínimo: `GET /api/migracion/users` debe incluir usuarios inactivos identificados como "histórico" (ej. `isActive:false` en general, o un criterio más fino si se quiere excluir bajas por otras razones — decisión de producto pendiente) para que el auto-mapeo y el `<Select>` puedan volver a resolverlos correctamente en corridas futuras. A queda documentada como alternativa de mayor alcance si el negocio decide que jamás quiere crear un `User` para un ex-empleado.

### Flujo UX recomendado
- **Match exacto (nombre histórico == `User.name` de un usuario visible):** badge "Auto-mapeado", `<Select>` preseleccionado, editable.
- **Sin match, pero existe candidato inactivo con nombre igual:** badge distinto, ej. **"Histórico — requiere confirmar"** (no "Auto-mapeado" silencioso, porque reactivar una atribución a alguien inactivo merece un click consciente del admin) — `<Select>` lo ofrece como opción, sin preseleccionarlo automáticamente. *(Requiere decidir explícitamente si el sistema puede auto-seleccionar un inactivo o solo lo sugiere — no diseñar esto sin esa decisión.)*
- **Sin match alguno:** badge **"Pendiente"** (ámbar, como hoy) — `<Select>` sin preselección, placeholder visible.
- **Opción "Conservar como histórico"** (sin `User`): NO viable sin Opción A (migración Prisma) — no incluir en el dropdown hasta que exista esa capacidad.
- **Opción "Crear empleado"** directamente desde este paso: viable reusando `createEmployee()` (Finding 9) detrás de un modal/formulario mínimo (nombre precargado con el `sellerName` histórico, email/password generados o capturados, `role` fijo `EMPLEADO`) — tras crear, refrescar la lista de `users` local (no la migración completa) y auto-seleccionar el nuevo `User.id` para esa fila.
- **Bloqueo de "Continuar":** igual que hoy — `canProceed = totalBlocking === 0` — ningún `sellerName` puede quedar sin `User.id` resuelto, porque el modelo no soporta otra cosa (§3).
- **Badges:** `Auto-mapeado` (match exacto, activo) / `Histórico — requiere confirmar` (match exacto, inactivo, no preseleccionado) / `Mapeado` (selección manual) / `Pendiente` (sin ningún match ni selección).

### Alcance técnico mínimo
- `app/api/migracion/users/route.ts` — ampliar el `where` para incluir candidatos históricos (criterio exacto: decisión de producto).
- `modules/migration/domain/inconsistency-classifier.ts` y/o `domain.types.ts` (`EmployeeMappingEntry`) — posible campo nuevo para distinguir "auto-mapeado activo" de "match histórico inactivo, no preseleccionado", si se adopta esa distinción de UX.
- `app/(dashboard)/configuracion/migracion/_components/InconsistencyStep.tsx` — nuevo badge, opción "Crear empleado" (modal reutilizando `createEmployee()`), no preseleccionar coincidencias inactivas automáticamente.
- Reutilización de `modules/users/users.service.ts` (`createEmployee`) — posible endpoint nuevo/adaptado si `/api/usuarios` actual está acoplado a la página `/usuarios` (no auditado en profundidad — fuera del alcance de "no reaudites toda Migración/Usuarios"; verificar acoplamiento exacto al implementar).
- Si se adopta Opción A en el futuro: `prisma/schema.prisma` (3 modelos), migración, tipos de dominio, `shift-sync.ts`/`member-upsert.ts` equivalentes, y toda consulta de reportes con `include: {cashier/user}` — alcance no trivial, no recomendado para esta iteración.

### Flujo BMAD
**`/bmad-create-story` → `/bmad-dev-story`.** No es fix manual trivial (toca contrato de API + UI + una decisión de producto explícita sobre semántica de badges/auto-selección de inactivos) ni encaja en `/bmad-quick-dev` (hay ambigüedad de diseño — el "requiere decidir explícitamente" del flujo UX — que debe resolverse en la Story antes de implementar, no durante).

## Reproduction Plan (verificación, no repro de bug destructivo)

1. Confirmado por lectura + consulta real de solo lectura (sin escritura): `User.findMany({where:{isActive:true}})` excluye a Alicia/Angélica; sin ese filtro, ambas aparecerían con `name` exacto igual al `sellerName` histórico.
2. Para confirmar el comportamiento del `<Select>` con `value=""` sin item correspondiente, bastaría una inspección visual manual del wizard con un `sellerName` sin match (no requiere backend real) — no ejecutado en esta investigación por no ser necesario para la conclusión (comportamiento de Radix ya documentado y consistente con el código).

**Status:** Concluded — causa raíz Confirmada, sin gaps de evidencia bloqueantes para decidir el siguiente paso.
