# Story: Ciclo de Vida de Empleados en el Wizard de Reconstruction

**Status:** review
**Epic:** Corrección/extensión ad-hoc — fuera de la numeración de Epic 1/2/3. Origen: `_bmad-output/implementation-artifacts/investigations/employee-mapping-historical-authorship-investigation.md` + `_bmad-output/implementation-artifacts/investigations/reconstruction-employee-lifecycle-investigation.md`.
**Prioridad:** Alta — sin esto, cada Reconstruction futura repite la pérdida de atribución histórica (caso Alicia/Angélica) y no existe forma de limpiar empleados sintéticos sobrantes sin salir del wizard.
**No implementado.** Solo Story. No se investigó desde cero — ambas investigaciones fuente están `Concluded`, sin gaps bloqueantes. No se ejecutó Sync/Reconstruction real, no se escribió en DB, no se usaron subagentes.

---

## Story

Como ADMIN que ejecuta una Reconstruction del sistema desde el wizard de Migración,
quiero mapear `sellerNames` históricos contra usuarios activos E inactivos, crear un empleado histórico inmediatamente cuando no exista, y elegir opcionalmente qué empleados sobrantes eliminar,
para no perder nunca más la atribución histórica real (caso Alicia/Angélica) y poder limpiar usuarios sintéticos sin salir del wizard ni tocar `/usuarios`.

---

## Contexto del desarrollador

### Causa raíz (Confirmada, no reabrir)

`GET /api/migracion/users` (`app/api/migracion/users/route.ts:11-15`) filtra `where: { isActive: true }`. `ALICIA ACEVEDO` y `ANGELICA` ya existen como `User` con `name` idéntico al `sellerName` histórico, pero `isActive:false` — el filtro los excluye de la lista que llega a `classifyInconsistencies()` y al `<Select>`. El auto-mapeo exacto case-insensitive (`modules/migration/domain/inconsistency-classifier.ts:9-19`) ya funciona correctamente y **no requiere cambios** — solo necesita recibir la lista completa de usuarios (activos e inactivos).

### Decisiones ya cerradas por las investigaciones (no reabrir)

1. **Opción B** (crear empleado histórico inactivo) sobre Opción A (columna paralela sin `User`, requiere migración Prisma) — B ya está probada en producción (`createEmployee()`, Story 3.3) y no requiere cambio de schema.
2. **Creación INMEDIATA** desde el wizard (no diferida a `executeReconstruction()`) — mantiene `employeeMapping` como `Record<string,string>` sin inventar un tipo intermedio de "crear diferido".
3. **`employeeMapping` sigue siendo `Record<sellerName, User.id>`** — sin cambios de contrato. Match exacto activo o inactivo → mismo badge `Auto-mapeado`, preseleccionado (no se introduce un badge intermedio de "confirmar histórico" — la primera investigación lo sugirió, la segunda, más reciente y autoritativa, lo simplifica; esta Story sigue la versión simplificada).
4. **Candidatos de eliminación = `Users` NO-ADMIN menos `Set(Object.values(employeeMapping))`**, calculado SERVER-SIDE, nunca confiando en lo que el cliente marque como "no usado".
5. **`deleteOperationalData()` ya corre en su propia transacción** (`reconstruction.service.ts:124-132`) y dentro de la Story de batching **ya devuelve** `deleteResult/productResult/membersResult/shiftsResult/pricingResult/finalizeResult` por fase, con `failedPhase`/`success` — el patrón a extender ya existe, no se inventa.
6. **Las únicas 3 relaciones bloqueantes de `User`** son `Shift.cashierId`, `InventoryMovement.userId`, `CashWithdrawal.userId` (sin `onDelete`, Restrict por default) — las 3 ya las vacía `deleteOperationalData()` para TODOS los usuarios, no solo los candidatos. Tras esa fase, cualquier `User` no-ADMIN puede eliminarse sin violar FK.
7. **Mecanismo de eliminación:** `auth.api.removeUser({ headers, body: { userId } })` (admin plugin, better-auth@1.4.12 instalado) — nunca `prisma.user.delete()` directo. Ya otorgado el permiso `user:delete` al rol `ADMIN` de este proyecto. Better Auth ya bloquea auto-eliminación (`YOU_CANNOT_REMOVE_YOURSELF`); este Story agrega una guardia redundante propia para dar mensaje claro antes de intentar la llamada.
8. **Atomicidad:** Better Auth NUNCA participa de `prisma.$transaction()` — el pipeline de `executeReconstruction()` YA NO es atómico de punta a punta (cada fase ya retorna `failedPhase` independiente). Agregar la fase de eliminación de empleados hereda el mismo modelo de fallo ya aceptado (backup como única red de recuperación) — no se inventa rollback.

### Estado real del código confirmado en este turno (no releer)

- `executeReconstruction(members, shifts, employeeMapping, reimportProducts)` (`modules/migration/reconstruction.service.ts:229-438`) ya sigue el patrón fase-por-fase con `failedPhase`/`return` temprano, replicado exactamente por D2 (`"pricing"`) — mismo patrón a seguir para la fase nueva.
- `ReconstructionPhase = "validation" | "delete" | "products" | "members" | "shifts" | "pricing" | "finalize"` (`reconstruction.service.ts:209`); mismo enum duplicado en `ReconstructionPhaseSchema` (`types/api/migracion.ts:247-255`).
- `UserRef`/`UserRefSchema` hoy son `{id, name, email}` (`domain.types.ts:172-176`, `types/api/migracion.ts:137-141`) — sin `role`/`isActive`.
- `EmployeeMappingEntry`/`classifyInconsistencies()` (`inconsistency-classifier.ts`) **no requieren cambios** — ya son agnósticos de `isActive`; solo dependen de qué lista de `users` reciben.
- `InconsistencyStep.tsx` es COMPARTIDO entre Sync (`MigracionManager.tsx:172`) y Reconstruction (`ReconstructionManager.tsx:84`) — cualquier cambio debe ser opt-in vía prop, nunca alterar el comportamiento de Sync.
- `app/api/migracion/reconstruccion/ejecutar/finalize/route.ts` ya tiene `FinalizeBodySchema` local (`importId, members, employeeMapping, reimportProducts`), ya valida completitud de staging y hace claim atómico ANTES de llamar `executeReconstruction()` — punto correcto para agregar `usersToDelete`.
- `UsersService.createEmployee()`/`setEmployeeActive()` (`modules/users/users.service.ts:116-165`, `:229-...`) ya existen y se reutilizan tal cual — `createEmployee()` fuerza `isActive:true`; hay que encadenar `setEmployeeActive(id, false)`.
- Los métodos que requieren sesión ADMIN de Better Auth (`resetEmployeePassword`, `revokeUserSessions` dentro de `setEmployeeActive`) llaman `headers: await headers()` **directamente dentro del Service**, importado de `next/headers` — no se pasa la sesión como parámetro desde la ruta. La fase nueva de eliminación sigue el mismo patrón.
- `CreateEmployeeInputSchema` (`types/api/users.ts`) acepta `role`/`email`/`password` del cliente — **no reutilizable tal cual** para el endpoint nuevo (violaría "el cliente no puede enviar role=ADMIN"). Se necesita un esquema propio y angosto.

### Decisiones que esta Story cierra (no dejadas abiertas por las investigaciones)

- **Nombre de la fase nueva en el pipeline:** `"employees"` — se agrega al enum `ReconstructionPhase`/`ReconstructionPhaseSchema` entre `"delete"` y `"products"` (coincide con el orden exigido: borrar datos operativos → eliminar empleados seleccionados → reset de productos).
- **Ubicación del código nuevo:** archivo nuevo `modules/migration/domain/employee-lifecycle.ts` (puro: reglas de validación de `usersToDelete` y cálculo de candidatos) + `modules/migration/employee-lifecycle.service.ts` (I/O: Prisma + Better Auth) — evita seguir engordando `reconstruction.service.ts` (ya 523 líneas) y mantiene el split puro/I-O ya usado por D2 (`product-pricing.ts`) y batching (`upload-batching.ts`).
- **`InconsistencyStep.tsx` NO se renombra** — se extiende con un prop `mode: "sync" | "reconstruction"` (default `"sync"`). Renombrar tocaría el import en `MigracionManager.tsx` sin ningún beneficio funcional y aumenta el riesgo de regresión en Sync (no-regresión exigida).
- **Validación de `usersToDelete` ocurre DENTRO de `executeReconstruction()`**, como parte del bloque de validación temprana ya existente (junto al chequeo de `members`/`shifts` no vacíos) — no se duplica la lógica de guardias en la ruta `finalize`. Único punto de verdad (P-8).

---

## Acceptance Criteria

### Bloque 1 — Usuarios activos e inactivos en el mapping

1. **AC-1** — `GET /api/migracion/users` elimina el filtro `where:{isActive:true}` y agrega `role`, `isActive` al `select`. La autenticación de la ruta no cambia (sigue exigiendo sesión, sin agregar/quitar chequeo de rol).
2. **AC-2** — `UserRef` (`domain.types.ts`) y `UserRefSchema` (`types/api/migracion.ts`) se amplían a `{id, name, email, role, isActive}` — sin migración Prisma, ambas columnas ya existen.
3. **AC-3** — `classifyInconsistencies()` no se modifica — recibe la lista ampliada de usuarios (activos e inactivos) tal cual, y el auto-mapeo exacto case-insensitive sigue funcionando sin fuzzy matching ni inferencia de alias.
4. **AC-4** — Un `sellerName` con match exacto contra un `User` `isActive:false` se auto-mapea igual que uno activo: badge `Auto-mapeado`, preseleccionado, editable. Sin badge intermedio de confirmación.
5. **AC-5** — `<Select>` de cada fila muestra TODOS los usuarios no-ADMIN (activos e inactivos), con indicador visual Activo/Inactivo por opción.

### Bloque 2 — Crear empleado histórico desde el wizard

6. **AC-6** — Nuevo endpoint `POST /api/migracion/reconstruccion/empleados-historicos`, solo ADMIN (`requireActiveAdminApi`), body `{ historicalName: string }` — **no acepta** `role`, `email`, ni `password` del cliente (esquema Zod propio, no `CreateEmployeeInputSchema`).
7. **AC-7** — El servicio genera server-side: email interno único no-personal (dominio no resoluble, ej. `@sgf.internal`, distinto de la convención manual `.local` ya vista en DB — no adoptada como estándar de código) y password aleatoria — nunca se muestra, imprime, loguea ni devuelve en la respuesta.
8. **AC-8** — El servicio reutiliza `UsersService.createEmployee({name: historicalName, email, password, role:"EMPLEADO"})` seguido de `UsersService.setEmployeeActive(id, false)` — sin reimplementar la lógica de alta. Responde `{id, name, email, role, isActive}` (mismo shape que `UserRefSchema`).
9. **AC-9** — El botón "Crear nuevo empleado" de una fila se deshabilita inmediatamente al click (estado `creating`), mismo patrón ya usado por `ImportSociosStep`/`ImportCortesStep` — un doble click o retry no debe crear dos `User` para el mismo intento lógico.
10. **AC-10** — Al crear exitosamente: la fila se marca `Creado`, se mapea de inmediato al nuevo `User.id`, la lista de opciones del `<Select>` de TODAS las filas se actualiza en memoria (sin recargar el preview, sin volver a subir Excel).
11. **AC-11** — Si dos `sellerNames` distintos deben converger al mismo empleado recién creado (ver Alicia/Angélica), la UI permite seleccionar el usuario ya creado en la segunda fila en vez de crear uno nuevo — nunca crea dos `User` para la misma persona histórica por diseño de UI (no hay deduplicación automática por nombre).

### Bloque 3 — Candidatos de eliminación (solo Reconstruction)

12. **AC-12** — Nuevo endpoint `POST /api/migracion/reconstruccion/candidatos-eliminacion`, solo ADMIN, body `{ employeeMapping: Record<string,string> }`, responde `DeletionCandidate[]` = `{id, name, isActive, shiftsCount, movementsCount, withdrawalsCount}` por candidato.
13. **AC-13** — Cálculo server-side, siempre: `candidatos = Users con role !== "ADMIN"` menos `Set(Object.values(employeeMapping))`. Nunca se confía en una lista calculada en el cliente.
14. **AC-14** — Un `EMPLEADO` activo puede aparecer como candidato (decisión de producto ya cerrada) — ninguna guardia adicional por estar activo en esta etapa de solo-lectura, solo se expone `isActive` para que la UI advierta.
15. **AC-15** — Esta sección ("Empleados no utilizados en esta reconstrucción") **solo se renderiza cuando `mode="reconstruction"`** — nunca en Sync, nunca agrega botón de eliminación en `/usuarios`.
16. **AC-16** — Ningún checkbox de candidato viene preseleccionado. Seleccionar es 100% opcional — la existencia de candidatos no bloquea `Continuar` (`canProceed` sigue dependiendo solo de `totalBlocking === 0`, sin cambios).
17. **AC-17** — Si `employeeMapping` cambia (nueva selección manual, o creación de empleado), los candidatos se recalculan; un `User` que pasa a ser destino del mapping deja de listarse, y si estaba marcado en `usersToDelete`, se remueve automáticamente de esa selección.

### Bloque 4 — Ejecución: revalidación, orden y eliminación real

18. **AC-18** — `FinalizeBodySchema` (`app/api/migracion/reconstruccion/ejecutar/finalize/route.ts`) agrega `usersToDelete: z.array(z.string().min(1)).default([])`. Antes de usarlo, el handler normaliza duplicados (`[...new Set(usersToDelete)]`).
19. **AC-19** — `executeReconstruction()` recibe `usersToDelete: string[]` y `authenticatedAdminId: string` como parámetros nuevos. Dentro de su bloque de validación temprana (mismo que ya valida `members`/`shifts` no vacíos, fase `"validation"`), valida el conjunto COMPLETO de `usersToDelete` contra la DB real: cada id debe (a) existir, (b) `role !== "ADMIN"`, (c) ser distinto de `authenticatedAdminId`, (d) no estar en `Object.values(employeeMapping)`. Si CUALQUIERA falla, retorna `success:false, failedPhase:"validation"` de inmediato — **cero eliminaciones**, ni siquiera `deleteOperationalData()` corre.
20. **AC-20** — La validación de AC-19 nunca confía en `isActive` como criterio — un `EMPLEADO` activo en `usersToDelete` que pase las 4 guardias es válido para eliminar.
21. **AC-21** — Orden real del pipeline tras pasar validación: `deleteOperationalData()` (fase `"delete"`) → eliminar los `usersToDelete` ya validados vía `auth.api.removeUser` (fase nueva `"employees"`, solo si `usersToDelete.length > 0`) → `resetProducts()` si aplica (fase `"products"`) → `syncMembers()` (`"members"`) → `syncShifts()` (`"shifts"`) → `restoreProductSalePrices()` si aplica (`"pricing"`) → `finalizeSyncMode()` (`"finalize"`, solo warning).
22. **AC-22** — `"employees"` se agrega a `ReconstructionPhase` (`reconstruction.service.ts`) y a `ReconstructionPhaseSchema` (`types/api/migracion.ts`), entre `"delete"` y `"products"`. Nuevo campo `employeeRemovalResult: {requested, removed} | null` en `ReconstructionExecutionResult`/`ReconstructionExecutionResultSchema` — poblado `null` en TODOS los `return` tempranos anteriores a esta fase, con valor real solo si la fase corrió.
23. **AC-23** — Si `auth.api.removeUser` falla para cualquier id (incluye el bloqueo propio de Better Auth `YOU_CANNOT_REMOVE_YOURSELF` como defensa redundante ya cubierta por AC-19c): `executeReconstruction()` retorna de inmediato `success:false, failedPhase:"employees"` — **no continúa** a `resetProducts`/`syncMembers`/`syncShifts`/`pricing`/`finalize`. No se envuelve en una transacción Prisma falsa, no hay rollback automático de los `User` ya eliminados en esa misma corrida (mismo modelo de fallo ya aceptado por el resto del pipeline — el mensaje de fallo indica restaurar desde el respaldo).
24. **AC-24** — Con `usersToDelete=[]` (default), el comportamiento de `executeReconstruction()` es IDÉNTICO al actual — la fase `"employees"` se omite (`employeeRemovalResult: null`), sin llamadas nuevas a Better Auth.
25. **AC-25** — El mecanismo de eliminación usa exclusivamente `auth.api.removeUser({ headers: await headers(), body: { userId } })` (import de `next/headers`, mismo patrón que `resetEmployeePassword`/`setEmployeeActive` ya existentes) — nunca `prisma.user.delete()` directo.
26. **AC-26** — `Sync` (`finalizeSyncMode`, `syncShifts` fuera de Reconstruction) no recibe ni procesa `usersToDelete` en ningún punto — el contrato de `sync-shifts/finalize` no cambia.

### Caso obligatorio — Alicia/Angélica

27. **AC-27** — Con `User` reales "ALICIA ACEVEDO" (`isActive:false`) y "ANGELICA" (`isActive:false`) ya en DB (confirmado, distintos `id`): tras el fix de AC-1, `ALICIA ACEVEDO` auto-mapea a su propio `User` (badge `Auto-mapeado`). `ANGELICA`, aunque también auto-mapearía a SU propio `User` por nombre exacto, puede sobrescribirse manualmente para apuntar a "Alicia Acevedo" (badge pasa a `Mapeado`) — el sistema nunca infiere esta convergencia por sí solo. Resultado: `employeeMapping = {"ALICIA ACEVEDO": aliciaId, "ANGELICA": aliciaId}` — dos claves, mismo valor, sin error ni advertencia (`Record<string,string>` ya lo soporta).
28. **AC-28** — Tras completar el mapping: `Alicia Acevedo` (usada por 2 claves) NO aparece en candidatos. El `User` "ANGELICA" (id distinto, ya no destino de ninguna clave) SÍ aparece como candidato, checkbox sin marcar por default.
29. **AC-29** — Si el ADMIN marca "ANGELICA" y ejecuta: pasa las 4 guardias de AC-19 (existe, no-ADMIN, no-self, no-destino-del-mapping) → se elimina vía `auth.api.removeUser` en la fase `"employees"`, después de `deleteOperationalData()` y antes de `syncShifts()` → `syncShifts()` atribuye toda venta histórica de `"ANGELICA"` (mapeada) al `User` Alicia seleccionado.

---

## Tasks / Subtasks

- [x] **T1 — Usuarios activos e inactivos** (AC-1, AC-2, AC-3, AC-4, AC-5)
  - [x] T1.1 — `app/api/migracion/users/route.ts`: quitar `where:{isActive:true}`, agregar `role: true, isActive: true` al `select`.
  - [x] T1.2 — `modules/migration/domain/domain.types.ts`: `UserRef` → agregar `role: "ADMIN" | "EMPLEADO"`, `isActive: boolean` (literal propio, sin importar `Role` de `modules/users` — evita acoplamiento cruzado entre módulos).
  - [x] T1.3 — `types/api/migracion.ts`: `UserRefSchema` → agregar `role: z.enum(["ADMIN","EMPLEADO"])`, `isActive: z.boolean()`.
  - [x] T1.4 — `InconsistencyStep.tsx`: `<SelectItem>` muestra indicador Activo/Inactivo por opción (ej. texto secundario o badge pequeño), filtra ADMIN fuera del `<Select>` (nunca ofrecerlo como destino de mapeo — decisión ya implícita, `role!=="ADMIN"`, salvo que ya exista un caso `ADMINISTRADOR → Nacho` en producción a preservar — **no filtrar ADMIN del `<Select>` de mapeo**, ya que el caso real de producción mapea explícitamente a un ADMIN; el filtro por rol aplica solo a candidatos de eliminación, AC-13, no al mapeo).

- [x] **T2 — Crear empleado histórico** (AC-6, AC-7, AC-8, AC-9, AC-10, AC-11)
  - [x] T2.1 — `types/api/migracion.ts`: nuevo `CreateHistoricalEmployeeInputSchema = z.object({ historicalName: z.string().min(1) })`.
  - [x] T2.2 — `modules/migration/employee-lifecycle.service.ts` (nuevo): `createHistoricalEmployee(historicalName): Promise<UserRefType>` — genera email (`migracion-historico+<slug>-<random>@sgf.internal`) y password aleatoria (≥6 chars, nunca retornada/logueada), llama `UsersService.createEmployee({name: historicalName, email, password, role:"EMPLEADO"})` seguido de `UsersService.setEmployeeActive(id, false)`, retorna `{id, name, email, role:"EMPLEADO", isActive:false}`. Traduce el error de email duplicado igual que `createEmployee` ya hace.
  - [x] T2.3 — `app/api/migracion/reconstruccion/empleados-historicos/route.ts` (nuevo): `requireActiveAdminApi()`, valida con `CreateHistoricalEmployeeInputSchema`, llama al servicio, `201` con el `UserRef` resultante.
  - [x] T2.4 — `InconsistencyStep.tsx`: acción "Crear nuevo empleado" por fila sin mapeo — precarga `historicalName`, deshabilita el botón al click (estado `creating` por fila), al éxito agrega el nuevo usuario a `users` local (`setUsers([...users, nuevo])`), mapea la fila (`setMapping`), marca badge `Creado`. Al fallo, rehabilita el botón y muestra el error sin perder el resto del estado del wizard.

- [x] **T3 — Candidatos de eliminación** (AC-12 a AC-17)
  - [x] T3.1 — `modules/migration/domain/employee-lifecycle.ts` (nuevo, puro): `computeDeletionCandidateIds(allNonAdminUserIds: string[], employeeMapping: Record<string,string>): string[]` = diferencia de conjuntos.
  - [x] T3.2 — `modules/migration/employee-lifecycle.service.ts`: `getDeletionCandidates(employeeMapping): Promise<DeletionCandidate[]>` — lee `User` con `role!=="ADMIN"`, aplica T3.1, para cada candidato cuenta `shiftsCount`/`movementsCount`/`withdrawalsCount` (`prisma.shift.count({where:{cashierId}})`, etc.).
  - [x] T3.3 — `types/api/migracion.ts`: `DeletionCandidateSchema = z.object({id, name, isActive, shiftsCount, movementsCount, withdrawalsCount})`.
  - [x] T3.4 — `app/api/migracion/reconstruccion/candidatos-eliminacion/route.ts` (nuevo): `requireActiveAdminApi()`, body `{employeeMapping}` validado con `EmployeeMappingSchema`, llama al servicio.
  - [x] T3.5 — `InconsistencyStep.tsx`: prop nuevo `mode: "sync" | "reconstruction" = "sync"`. Cuando `mode==="reconstruction"` y `canProceedNow`, sub-sección "Empleados no utilizados en esta reconstrucción": fetch a candidatos-eliminación cada vez que `mapping` cambia, checkbox por candidato (ninguno marcado por default), badge Activo/Inactivo, advertencia visual reforzada si `isActive`. Estado `usersToDelete: string[]` local; al recalcular candidatos, filtra `usersToDelete` para remover ids que ya no aparezcan en la lista nueva.
  - [x] T3.6 — `onComplete` de `InconsistencyStep` pasa a `(mapping: Record<string,string>, usersToDelete: string[]) => void` — en `mode="sync"` siempre invoca con `usersToDelete=[]`; `MigracionManager.tsx` ignora el segundo argumento sin cambios de comportamiento.
  - [x] T3.7 — `ReconstructionManager.tsx`: nuevo estado `usersToDelete: string[]`, poblado en `handleInconsistencyComplete`, pasado como prop nueva a `ExecutionStep`, y a `InconsistencyStep` con `mode="reconstruction"`.

- [x] **T4 — Contrato de `finalize` + guardias server-side** (AC-18, AC-19, AC-20)
  - [x] T4.1 — `app/api/migracion/reconstruccion/ejecutar/finalize/route.ts`: `FinalizeBodySchema` agrega `usersToDelete: z.array(z.string().min(1)).default([])`. Antes de usar, `const dedupedUsersToDelete = [...new Set(parsed.data.usersToDelete)]`.
  - [x] T4.2 — Pasar `dedupedUsersToDelete` y `adminUserId` (ya resuelto por `requireActiveAdminApi()`) a `executeReconstruction(...)` como nuevos parámetros.
  - [x] T4.3 — `modules/migration/domain/employee-lifecycle.ts`: función pura `validateUsersToDelete(usersToDelete: string[], existingUsers: {id:string; role:"ADMIN"|"EMPLEADO"}[], employeeMapping: Record<string,string>, authenticatedAdminId: string): {valid: boolean; invalidIds: string[]; reason: string | null}` — implementa las 4 guardias de AC-19 sobre datos ya cargados (sin Prisma).
  - [x] T4.4 — `executeReconstruction()`: en su bloque de validación temprana (junto al chequeo de `members`/`shifts`), si `usersToDelete.length>0`, cargar `prisma.user.findMany({where:{id:{in:usersToDelete}}, select:{id,role}})` y llamar `validateUsersToDelete()`; si `!valid`, retornar `failedPhase:"validation"` con mensaje que identifique los ids inválidos y la razón — sin ejecutar `deleteOperationalData()`.

- [x] **T5 — Fase de eliminación en el pipeline** (AC-21 a AC-26)
  - [x] T5.1 — `modules/migration/employee-lifecycle.service.ts`: `removeSelectedEmployees(userIds: string[]): Promise<{requested: number; removed: number}>` — loop secuencial `auth.api.removeUser({headers: await headers(), body:{userId}})`; si CUALQUIER llamada lanza, re-lanza inmediatamente (no continúa con el resto de la lista) para que `executeReconstruction()` la capture y aborte.
  - [x] T5.2 — `reconstruction.service.ts`: agregar `"employees"` a `ReconstructionPhase` (entre `"delete"` y `"products"`); nuevo campo `employeeRemovalResult: {requested:number; removed:number} | null` en `ReconstructionExecutionResult`; nuevo parámetro `usersToDelete: string[]` y `authenticatedAdminId: string` en `executeReconstruction(...)`.
  - [x] T5.3 — Insertar la llamada a `removeSelectedEmployees(usersToDelete)` inmediatamente después de `deleteOperationalData()` exitoso y antes de `resetProducts()`/`syncMembers()` — solo si `usersToDelete.length>0`; en caso contrario `employeeRemovalResult: null` sin llamar Better Auth. Envolver en `try/catch`: fallo → `return {success:false, failedPhase:"employees", ...}` (mismo patrón de `return` temprano que las demás fases), sin invocar `resetProducts`/`syncMembers`/`syncShifts`/`pricing`/`finalize`.
  - [x] T5.4 — Agregar `employeeRemovalResult: null` a TODOS los `return` tempranos existentes (`"validation"`, `"delete"`) y al nuevo de `"employees"`; el `return` final de éxito lleva el valor real (o `null` si `usersToDelete` estaba vacío).
  - [x] T5.5 — `types/api/migracion.ts`: agregar `"employees"` a `ReconstructionPhaseSchema` (entre `"delete"` y `"products"`); nuevo `EmployeeRemovalResultSchema = z.object({requested:z.number(), removed:z.number()})`; agregar `employeeRemovalResult: EmployeeRemovalResultSchema.nullable()` a `ReconstructionExecutionResultSchema`.
  - [x] T5.6 — `ExecutionStep.tsx`: incluir `usersToDelete` en el body de `POST .../ejecutar/finalize` (junto a `members`, `employeeMapping`, `reimportProducts`).

- [x] **T6 — Pruebas (smoke tests, sin DB real destructiva)**
  - [x] T6.1 — Crear `scripts/employee-lifecycle-smoke-test.ts` (patrón `assert()` existente) cubriendo la matriz de comportamiento de abajo — todo contra las funciones PURAS de `modules/migration/domain/employee-lifecycle.ts`, sin Prisma ni Better Auth.
  - [x] T6.2 — Registrar `"smoke:employee-lifecycle": "tsx scripts/employee-lifecycle-smoke-test.ts"` en `package.json`.
  - [x] T6.3 — Validación general: `npx tsc --noEmit`; `npm run lint` acotado a archivos nuevos/tocados; `npm run smoke:employee-lifecycle`; re-ejecutar smoke suites existentes de Migración/Reconstruction (`smoke:migracion-batching`, `smoke:product-pricing`, `smoke:product-reset`, `smoke:reconstruction-report`, `smoke:sync-finalize`, `smoke:shift-sync`) para confirmar cero regresión.
  - [x] T6.4 — Si se requieren `User` temporales para una prueba HTTP no destructiva (sin ejecutar Reconstruction real), crearlos y eliminarlos de forma controlada, confirmando cero residuos — no ejecutar Sync ni Reconstruction reales en ningún caso.

---

## Matriz de comportamiento (smoke tests — reemplaza la lista de 17 casos por escenario)

| # | Función pura bajo prueba | Entrada relevante | Resultado esperado |
|---|---|---|---|
| 1 | `computeDeletionCandidateIds` | Users no-ADMIN = {Alicia, Angélica, GAEL, Andrew}; `mapping` values = {Alicia, GAEL} | candidatos = {Angélica, Andrew} |
| 2 | `computeDeletionCandidateIds` | Users no-ADMIN incluye 1 EMPLEADO `isActive:true` no usado | aparece igual como candidato (sin filtro por `isActive`) |
| 3 | `computeDeletionCandidateIds` | `mapping` con 2 claves → mismo `User.id` (Alicia) | ese `User.id` aparece UNA vez en `Set(values)`, nunca es candidato |
| 4 | `computeDeletionCandidateIds` | Lista de Users incluye 1 ADMIN | ADMIN nunca aparece en el resultado, sin importar `mapping` |
| 5 | `validateUsersToDelete` | id inexistente en `existingUsers` | `valid:false`, id listado en `invalidIds` |
| 6 | `validateUsersToDelete` | id con `role:"ADMIN"` | `valid:false` |
| 7 | `validateUsersToDelete` | id === `authenticatedAdminId` | `valid:false` |
| 8 | `validateUsersToDelete` | id ∈ `Object.values(employeeMapping)` | `valid:false` |
| 9 | `validateUsersToDelete` | ids duplicados en `usersToDelete`, todos válidos | `valid:true` (deduplicación ya ocurrió antes de invocar, en la ruta) |
| 10 | `validateUsersToDelete` | mezcla: 1 id válido + 1 inválido | `valid:false` — el conjunto completo se rechaza, no hay eliminación parcial |
| 11 | `validateUsersToDelete` | `usersToDelete=[]` | `valid:true` trivialmente — no bloquea Reconstruction sin selección |
| 12 | Caso Alicia/Angélica (integración de las funciones puras, sin DB) | `mapping={"ALICIA ACEVEDO":aliciaId,"ANGELICA":aliciaId}`, candidato marcado=`angelicaId` | `angelicaId` pasa `validateUsersToDelete` (no está en `Set(values)`); `aliciaId` nunca es candidato |

**Cobertura de orquestación (no requiere DB real, se verifica por lectura de código en Code Review, no con smoke test de integración):** fase `"employees"` corre después de `"delete"` y antes de `"products"`/`"members"`/`"shifts"`; fallo en `removeSelectedEmployees` produce `return` temprano sin invocar las fases siguientes; `usersToDelete=[]` no llama a Better Auth; `sync-shifts/finalize` no acepta ni procesa `usersToDelete` en su `FinalizeBodySchema` (confirmar que ese schema, en `app/api/migracion/sync-shifts/finalize/route.ts`, permanece sin el campo).

---

## Dev Notes

### Archivos NUEVOS

| Archivo | Contenido |
|---|---|
| `modules/migration/domain/employee-lifecycle.ts` | `computeDeletionCandidateIds()`, `validateUsersToDelete()` — puras |
| `modules/migration/employee-lifecycle.service.ts` | `createHistoricalEmployee()`, `getDeletionCandidates()`, `removeSelectedEmployees()` — I/O (Prisma + Better Auth), reutiliza `UsersService` |
| `app/api/migracion/reconstruccion/empleados-historicos/route.ts` | `POST`, crea empleado histórico |
| `app/api/migracion/reconstruccion/candidatos-eliminacion/route.ts` | `POST`, candidatos server-side |
| `scripts/employee-lifecycle-smoke-test.ts` | smoke test de las funciones puras |

### Archivos que CAMBIAN

| Archivo | Cambio |
|---|---|
| `app/api/migracion/users/route.ts` | quitar filtro `isActive`, ampliar `select` |
| `modules/migration/domain/domain.types.ts` | `UserRef` +`role`+`isActive` |
| `types/api/migracion.ts` | `UserRefSchema` ampliado; `+DeletionCandidateSchema`; `+CreateHistoricalEmployeeInputSchema`; `"employees"` en `ReconstructionPhaseSchema`; `+EmployeeRemovalResultSchema`; `+employeeRemovalResult` en `ReconstructionExecutionResultSchema` |
| `modules/migration/reconstruction.service.ts` | `"employees"` en `ReconstructionPhase`; `+employeeRemovalResult`; `executeReconstruction()` +2 parámetros (`usersToDelete`, `authenticatedAdminId`) + validación temprana + fase nueva |
| `app/api/migracion/reconstruccion/ejecutar/finalize/route.ts` | `FinalizeBodySchema` +`usersToDelete`; dedup; pasar a `executeReconstruction` |
| `app/(dashboard)/configuracion/migracion/_components/InconsistencyStep.tsx` | prop `mode`; acción crear empleado; sección candidatos; `onComplete` con 2do argumento |
| `app/(dashboard)/configuracion/migracion/_components/ReconstructionManager.tsx` | estado `usersToDelete`; pasar `mode="reconstruction"` |
| `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` | ignorar 2do argumento de `onComplete` (sin cambio de comportamiento) |
| `app/(dashboard)/configuracion/migracion/_components/ExecutionStep.tsx` | prop `usersToDelete`; incluir en body de `finalize` |
| `package.json` | `+smoke:employee-lifecycle` |

### Archivos que NO cambian

- `modules/migration/domain/inconsistency-classifier.ts` — cero cambios, ya es agnóstico de `isActive`.
- `modules/users/users.service.ts` — se reutiliza `createEmployee`/`setEmployeeActive` sin tocar.
- `app/api/migracion/sync-shifts/*`, `finalizeSyncMode`, `syncShifts`, `syncMembers` — Sync no recibe `usersToDelete`.
- `modules/migration/domain/upload-batching.ts` — batching/staging/claim no se reauditan ni se tocan.
- `prisma/schema.prisma` — sin migración, `role`/`isActive` ya existen en `User`.

### Riesgo — atomicidad (documentar, no resolver)

Better Auth no participa en `prisma.$transaction()`. Si `removeSelectedEmployees()` falla a mitad de la lista (ej. 1 de 3 ids eliminado), esos `User` ya eliminados NO se revierten — mismo modelo de fallo parcial ya aceptado por el resto del pipeline desde antes de esta Story (cada fase ya es un `return` temprano independiente, con el backup como única red de recuperación). No se implementa rollback manual ni una segunda Reconstruction automática.

### Riesgo — cuentas basura

El generador de email (`@sgf.internal`) es una convención NUEVA de código, no la reutilización de `.local`/`nachogym` vista manualmente en DB (esa era un dato de una sesión pasada, no un estándar de código existente).

---

## Dev Agent Record

**Estado:** Implementación completa. Los 4 capacidades pedidas por `/bmad-dev-story` (Bloques 1-4 de AC) implementadas. Ninguna contradicción técnica real encontrada entre la Story y el código actual — todas las decisiones ya cerradas por las investigaciones se respetaron sin reabrir diseño.

### Completion Notes

- **Bloque 1 (Users activos e inactivos):** `GET /api/migracion/users` sin filtro `isActive`, `select` ampliado con `role`/`isActive`. `UserRef`/`UserRefSchema` ampliados. `classifyInconsistencies()` NO se tocó (confirmado agnóstico de `isActive`, tal como documentaba la Story). `<Select>` de `InconsistencyStep` muestra indicador "(Inactivo)" por opción.
- **Bloque 2 (crear empleado histórico):** nuevo endpoint `POST /api/migracion/reconstruccion/empleados-historicos`, esquema `CreateHistoricalEmployeeInputSchema` (solo `historicalName` — sin `role`/`email`/`password` del cliente). `createHistoricalEmployee()` reutiliza `UsersService.createEmployee()` + `setEmployeeActive(id,false)` sin reimplementar lógica. Email interno generado con convención nueva `migracion-historico+<slug>-<random>@sgf.internal`; password aleatoria (`randomBytes(18).toString("base64url")`, nunca retornada/logueada). Idempotencia ante doble click/retry: botón "Crear nuevo empleado" se deshabilita por fila vía estado `creatingRows` (mismo patrón que `ImportSociosStep`/`ImportCortesStep`).
- **Bloque 3 (candidatos de eliminación):** nuevo endpoint `POST /api/migracion/reconstruccion/candidatos-eliminacion`, cálculo 100% server-side (`getDeletionCandidates()` — query `role !== "ADMIN"` menos `Set(Object.values(employeeMapping))`, nunca confía en `isActive`). Sección "Empleados no utilizados en esta reconstrucción" solo se renderiza con `mode="reconstruction"` — Sync nunca la ve, `/usuarios` no se tocó. Ningún checkbox preseleccionado. Recalcula candidatos en cada cambio de `mapping` y filtra `usersToDelete` para remover ids que dejaron de ser candidatos.
- **Bloque 4 (ejecución):** `executeReconstruction()` recibe `usersToDelete`/`authenticatedAdminId` nuevos, valida el conjunto COMPLETO (`validateUsersToDelete()`, 4 guardias: existe, no-ADMIN, no-self, no-destino-del-mapping) ANTES de `deleteOperationalData()` — es la única y single source of truth de esta guardia (la ruta `finalize` solo deduplica y pasa los parámetros, no reimplementa validación). Fase nueva `"employees"` corre después de `deleteOperationalData()` y antes de `resetProducts()`/`syncMembers()`/`syncShifts()`. Eliminación real vía `auth.api.removeUser` (nunca `prisma.user.delete()`), `headers()` obtenido dentro del Service (mismo patrón que `resetEmployeePassword`/`setEmployeeActive`). Fallo de eliminación → `return` temprano con `failedPhase:"employees"`, sin invocar fases posteriores — atomicidad parcial documentada, sin rollback inventado.
- **Caso Alicia/Angélica:** cubierto por el test #12 del smoke (mapping con 2 claves → mismo `User.id`; Alicia nunca candidata; Angélica sí; `validateUsersToDelete` la acepta como eliminable).
- **Contradicciones encontradas:** ninguna. El código real coincidía en todos los puntos con lo documentado por ambas investigaciones y por la Story (`executeReconstruction` signature, `ReconstructionPhase` enum, `FinalizeBodySchema`, `createEmployee`/`setEmployeeActive`, patrón `headers()` dentro del Service).
- **No ejecutado (fuera de alcance de esta pasada, según instrucción explícita):** Sync real, Reconstruction real, borrado de Users reales. No se crearon Users temporales para pruebas HTTP — la cobertura de esta pasada es 100% vía las funciones puras nuevas (smoke test) más regresión de las suites existentes; no se consideró necesario un round-trip HTTP contra DB real para las 4 capacidades pedidas (CRUD estándar sobre patrones ya usados en `users.service.ts`).

### Validación ejecutada

- `npm run smoke:employee-lifecycle` → 12/12 ✓ (nuevo — matriz compacta reemplaza los 17 casos literales de la Story original)
- `npm run smoke:inconsistency` → 33/33 ✓ (fixture `UserRef` actualizado con `role`/`isActive`, sin cambio de comportamiento)
- `npm run smoke:migracion-batching` → 28/28 ✓
- `npm run smoke:product-pricing` → 7/7 ✓
- `npm run smoke:product-reset` → 9/9 ✓
- `npm run smoke:reconstruction-report` → 6/6 ✓
- `npm run smoke:sync-finalize` → 11/11 ✓
- `npm run smoke:shift-sync` → 31/31 ✓
- `npx tsc --noEmit` → sin errores
- `npx eslint` acotado a los 14 archivos nuevos/modificados → 0 problemas

### File List

**Nuevos:**
- `modules/migration/domain/employee-lifecycle.ts`
- `modules/migration/employee-lifecycle.service.ts`
- `app/api/migracion/reconstruccion/empleados-historicos/route.ts`
- `app/api/migracion/reconstruccion/candidatos-eliminacion/route.ts`
- `scripts/employee-lifecycle-smoke-test.ts`

**Modificados:**
- `app/api/migracion/users/route.ts`
- `modules/migration/domain/domain.types.ts`
- `types/api/migracion.ts`
- `modules/migration/reconstruction.service.ts`
- `app/api/migracion/reconstruccion/ejecutar/finalize/route.ts`
- `app/(dashboard)/configuracion/migracion/_components/InconsistencyStep.tsx`
- `app/(dashboard)/configuracion/migracion/_components/ReconstructionManager.tsx`
- `app/(dashboard)/configuracion/migracion/_components/ExecutionStep.tsx`
- `package.json`
- `scripts/inconsistency-smoke-test.ts` (fixture `UserRef` ampliado — fallout mecánico del cambio de tipo, sin cambio de comportamiento)

**No tocados (confirmado):** `modules/migration/domain/inconsistency-classifier.ts`, `modules/users/users.service.ts`, `app/api/migracion/sync-shifts/*`, `modules/migration/domain/upload-batching.ts`, `prisma/schema.prisma`, `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` (acepta el nuevo 2do argumento de `onComplete` por compatibilidad de tipos de función en TS, sin editar el archivo).

### Change Log

- Implementación de ciclo de vida de empleados en Reconstruction: mapping ve Users activos/inactivos, creación inmediata de empleado histórico idempotente, candidatos de eliminación server-side con selección opcional del ADMIN, y fase nueva `"employees"` en `executeReconstruction()` con guardias completas antes de eliminar vía `auth.api.removeUser`.
