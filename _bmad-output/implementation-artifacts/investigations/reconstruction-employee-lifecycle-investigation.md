# Investigation: Ciclo de vida de empleados dentro de Reconstruction (crear/eliminar)

## Hand-off Brief

1. **Qué se investigó.** Cómo extender `EmployeeMappingStep`/`ExecutionStep` de Reconstruction para: reutilizar usuarios activos e inactivos, crear empleados históricos bajo elección explícita del ADMIN, y eliminar empleados sobrantes (no destino del mapping final) como parte de la misma corrida — sin salir del wizard. Continúa `employee-mapping-historical-authorship-investigation.md`.
2. **Dónde está la evidencia.** Confirmado en código real: `deleteOperationalData()` corre en su PROPIA transacción Prisma aislada (`reconstruction.service.ts:125-132`), no envuelve el resto del pipeline. Las únicas 5 relaciones reales a `User` en todo el schema son `Session`/`Account` (Cascade) y `Shift.cashierId`/`InventoryMovement.userId`/`CashWithdrawal.userId` (sin `onDelete`, Restrict por default) — las 3 últimas son exactamente las que `deleteOperationalData()` ya vacía. Better Auth expone `auth.api.removeUser` (admin plugin, `node_modules/better-auth/dist/plugins/admin/routes.mjs:686-714`) con guardias propias (auto-eliminación bloqueada, permiso `user:delete` ya otorgado al rol `ADMIN` de este proyecto).
3. **Qué sigue.** El diseño es viable sin cambio de schema. Requiere: 1 endpoint nuevo (crear empleado histórico, reutilizando `UsersService.createEmployee()` con input restringido), 1 endpoint nuevo (candidatos a eliminar, cálculo server-side), y extender el contrato de `reconstruccion/ejecutar/finalize` con `usersToDelete: string[]` + `employeeMapping` ya resuelto (sin nuevos tokens de "crear diferido" — ver recomendación de creación inmediata). Ruta: `/bmad-create-story` → `/bmad-dev-story`.

## Case Info

| Field | Value |
|---|---|
| Ticket | N/A — diseño solicitado directamente, sin bug |
| Date opened | 2026-07-09 |
| Status | Concluded — diseño completo, evidencia de código real, sin gaps bloqueantes |
| System | Wizard de Reconstruction — `EmployeeMappingStep` (a crear/renombrar de `InconsistencyStep`), `ExecutionStep`, `reconstruccion/ejecutar/{stage,finalize}` |
| Evidence sources | `modules/migration/reconstruction.service.ts`, `modules/migration/migration.service.ts`, `prisma/schema.prisma` completo, `modules/users/users.service.ts`, `types/api/users.ts`, `app/api/usuarios/route.ts`, `node_modules/better-auth` (admin plugin, v1.4.12 real instalado), `app/api/migracion/reconstruccion/ejecutar/{stage,finalize}/route.ts` (contrato post-Story de batching), consulta de solo lectura contra `User` real |

---

## 1. Flujo actual

**Pipeline confirmado (lectura de código, sin ejecutar nada):**

```
FileUploadStep → PreviewStep → InconsistencyStep (employeeMapping vive en
ReconstructionManager.tsx state, se pasa a ExecutionStep)
→ DeletionPreviewStep → BackupStep → FinalConfirmationStep
→ ExecutionStep: genera importId, particiona shifts, POST .../stage (N veces)
→ POST .../ejecutar/finalize {importId, members, employeeMapping, reimportProducts}
→ finalize/route.ts: valida completitud de staging, claim atómico, rehidrata,
  llama executeReconstruction(members, shifts, employeeMapping, reimportProducts)
→ executeReconstruction():
   1. guard members/shifts no vacíos
   2. deleteOperationalData() — transacción propia, borra
      CashWithdrawal → InventoryMovement → Shift → Member (orden FK-safe)
   3. resetProducts() si reimportProducts (fuera de transacción)
   4. syncMembers(members)
   5. syncShifts(shifts, employeeMapping)
   6. restoreProductSalePrices() si reimportProducts
   7. finalizeSyncMode(shifts, shiftsResult) — fallo aquí es warning, no bloquea
→ cleanup de staging (finalize/route.ts, camino feliz)
```

- **`employeeMapping` vive en:** estado de React de `ReconstructionManager.tsx` (`Record<string,string>`), viaja intacto por `handleInconsistencyComplete`/props hasta `ExecutionStep`, y de ahí al body JSON de `.../ejecutar/finalize`.
- **Inicialización:** `InconsistencyStep.tsx:44-50` — solo entradas con `isAutoMapped && resolvedUserId` (match exacto contra usuarios `isActive:true`, ver investigación previa) arrancan pre-llenadas; el resto arranca ausente (no `""`, ausente).
- **`canProceed`:** `inconsistency-classifier.ts:29,41` — `totalBlocking = employeeMappings.filter(e => !e.resolvedUserId).length`; `canProceed = totalBlocking === 0`. Se recalcula en cada render vía `currentBlocking` en `InconsistencyStep.tsx:76-80`, usando `mapping` (el estado real, no `resolvedUserId` del snapshot inicial) — confirma que selecciones manuales SÍ desbloquean correctamente.
- **Datos de `User` que recibe la UI hoy:** `id`, `name`, `email` (`UserRef`/`app/api/migracion/users/route.ts:13`) — **NO** incluye `role` ni `isActive` en el shape actual.
- **Cómo llega `employeeMapping` al `finalize` hoy:** JSON directo en el body de `POST .../ejecutar/finalize`, validado por `EmployeeMappingSchema` (`z.record(z.string(), z.string())`, `types/api/migracion.ts`), sin staging — ya es pequeño (Story de batching lo dejó fuera del staging de `shifts` a propósito).
- **Campos adicionales que podrían viajar al `finalize` sin romper el staging actual:** cualquier cosa en el MISMO body JSON de `finalize` (que no pasa por `stage`) — `usersToDelete: string[]`, y si se elige creación diferida, `employeesToCreate`. El staging de `shifts` (`MigrationImportStaging`) es indiferente a esto; no requiere cambios de schema de staging.
- **Primer punto de escritura destructiva:** `deleteOperationalData()` (`reconstruction.service.ts:279`, dentro de `executeReconstruction`) — es la PRIMERA llamada que muta la base, después de que `finalize/route.ts` ya ganó el claim atómico y ya pasó la verificación de completitud de staging. Nada antes de este punto escribe en tablas operativas.

---

## 2. Usuarios activos e inactivos

**Confirmado:** `app/api/migracion/users/route.ts:11-15` — `prisma.user.findMany({ where: { isActive: true }, select: {id,name,email}, orderBy: {name:"asc"} })`.

**Cambio mínimo:** quitar el `where: {isActive:true}` (o ampliarlo para excluir solo lo que el negocio decida — para este alcance, quitarlo por completo es lo correcto: el propósito de este endpoint es "candidatos de mapeo", no "empleados operativos"). Agregar `role` e `isActive` al `select` — ambos ya son columnas reales de `User` (`prisma/schema.prisma:62-63`), sin migración.

**Tipo `UserRef` actual** (`modules/migration/domain/domain.types.ts:174-178`): `{id, name, email}`. Ampliar a `{id, name, email, role, isActive}` — cambio de tipo de dominio puro, sin tocar Prisma.

**Razón técnica para impedir mapear a un `User` inactivo:** **ninguna encontrada.** `syncShifts()`/`buildShiftUpsertData` (Finding 7 de la investigación previa) solo exigen que `cashierId`/`userId` sea una FK válida — cero chequeo de `isActive`/`role` en la escritura. Confirmado también en `syncMembers()` (no aplica, no usa `employeeMapping`) y en `finalizeSyncMode()` (no toca `User`). La restricción de hoy es 100% del endpoint de lectura, no de la capa de escritura — no hay "identidad histórica" mezclada con "acceso" en la escritura, solo en el filtro de candidatos.

---

## 3. Mapping intermedio y final

**El contrato final SÍ puede seguir siendo `Record<sellerName, User.id>`** — cada fila, sea auto-mapeada, manual, o recién creada, termina resolviendo a un `User.id` real antes de llegar al `finalize`. No se necesita cambiar `EmployeeMappingSchema`.

**Estado intermedio (solo cliente, nunca cruza a la API) — mínimo necesario:**

```ts
type MappingRowState =
  | { kind: "pending" }
  | { kind: "existing"; userId: string }       // activo o inactivo, misma forma
  | { kind: "created"; userId: string };       // ya resuelto tras crear — para el badge, no para el contrato
```

`kind: "created"` es indistinguible de `"existing"` para el `finalize` (ambos ya tienen `userId` real) — solo importa para decidir qué badge mostrar en la UI. **No existe un cuarto estado "crear, diferido, sin `userId` todavía"** en el diseño recomendado — ver §4, recomendación de creación inmediata.

---

## 4. Crear empleado histórico desde el wizard

**Reutilizable sin cambios:** `modules/users/users.service.ts:116-165` (`createEmployee`) — Service ya coordina Better Auth (`auth.api.createUser`) + `prisma.user.update()` (phone/notes/isActive) + rollback de mejor esfuerzo. Cero necesidad de reimplementar esta lógica (P-2/P-8 del proyecto: un caso de uso, un Service).

**NO reutilizable tal cual:** `POST /api/usuarios` (`app/api/usuarios/route.ts:23-36`) — usa `CreateEmployeeInputSchema` (`types/api/users.ts:11-18`), que acepta `role: z.enum(["ADMIN","EMPLEADO"])` **desde el cliente sin restricción**. Reutilizar este endpoint verbatim para el wizard permitiría a un cliente malicioso/con bug enviar `role:"ADMIN"` — el mismo riesgo que el pedido pide evitar explícitamente (§10).

**Diseño correcto:** un endpoint NUEVO y más angosto (ej. `POST /api/migracion/reconstruccion/empleados-historicos`) que:
1. Valida con un esquema propio que **NO acepta `role` ni `password` del cliente** — solo `{ historicalName: string }` (o `{name: string}` si se permite editar antes de crear).
2. Llama `UsersService.createEmployee({ name, email: <generado>, password: <generado>, role: "EMPLEADO", phone: undefined, notes: <ej. "Creado desde wizard de Reconstruction, autoría histórica"> })` — `role` y `password` fijados server-side, nunca desde el body.
3. Llama inmediatamente después `UsersService.setEmployeeActive(userId, false)` (Story 3.4, ya existente) — porque `createEmployee()` fuerza `isActive:true` (`users.service.ts:155`), y el pedido exige `isActive:false` para estos.
4. Devuelve `{id, name, email, role, isActive}` (mismo shape que `UserRef` ampliado) para que el cliente actualice sus opciones sin recargar nada.

**Email interno — sin inventar regla de negocio:** el patrón `*.historico@nachogym.local` visto en la DB es **dato manual de una sesión pasada, no código** (confirmado: cero referencias a `"historico"` o `.local` en todo `modules/`/`app/`/`lib/`/`types/`). La recomendación es generar, en código, algo NUEVO y explícitamente interno — ej. `migracion-historico+<slug-del-nombre>-<sufijo-aleatorio-corto>@sgf.internal` — documentado como convención NUEVA de este flujo (dominio `sgf.internal` no resoluble, para que sea imposible de confundir con un correo real). No copiar `.local`/`nachogym` como si fuera un estándar ya decidido — no lo es.

**Colisiones:**
- **Mismo `sellerName` dos veces en el mismo mapping:** no es colisión de creación — ambas filas simplemente deben mapear al MISMO `User.id` tras crear una sola vez (ver caso Alicia/Angélica, §12) — la UI debe permitir "usar este ya creado" para la segunda fila, no crear dos veces.
- **Slug repetido / email duplicado:** `User.email @unique` (`prisma/schema.prisma:59`) — Better Auth ya rechaza con error (`users.service.ts:132-134` ya traduce ese caso a `DUPLICATE_EMAIL_MESSAGE`). Generar el sufijo aleatorio en el email (no solo el slug del nombre) reduce la probabilidad casi a cero; el manejo de error ya existe si de todos modos colisiona.
- **Retry HTTP / doble click:** `createEmployee()` NO es idempotente (no hay una clave de idempotencia) — dos clicks/retries generarían DOS `User`s distintos con el mismo `name` pero emails distintos (el generador de email produce uno nuevo cada vez). **Mitigación recomendada:** deshabilitar el botón "Crear nuevo empleado" de esa fila inmediatamente al click (estado `creating`), igual que ya hace `ImportSociosStep`/`ImportCortesStep` con sus botones de importación — no es un problema nuevo, es el mismo patrón ya usado en este proyecto.
- **Usuario creado pero respuesta perdida (timeout de red):** con creación INMEDIATA (ver recomendación abajo), esto deja un `User` `isActive:false` huérfano en la fila del wizard (no en la fila de `mapping`, que se queda `pending`) — recuperable manualmente desde `/usuarios` (ya visible ahí, con nombre reconocible). No es peor que cualquier otro timeout de creación de empleado ya posible hoy desde `/usuarios` mismo.

**Pregunta crítica — ¿inmediata o diferida (dentro de `executeReconstruction`, tras el backup)?**

| | Inmediata (al hacer click en el wizard, antes de llegar a `finalize`) | Diferida (dentro de `executeReconstruction`, después del backup) |
|---|---|---|
| Escrituras antes del backup | Sí — el `User` ya existe cuando se llega a `BackupStep` | No |
| Retry / doble click | Mismo riesgo en ambos casos — mitigado igual (deshabilitar botón) | Igual, pero ahora dentro de una fase ya difícil de reintentar aisladamente (ver Story de batching: `finalize` no tiene retry granular por fase) |
| Usuarios huérfanos si se abandona el wizard | Si el ADMIN abandona tras crear pero antes de `Continuar`, el `User` queda huérfano — mismo riesgo que abandonar `/usuarios` a medias, ya aceptado hoy | Igual riesgo, pero solo se materializa si `executeReconstruction` falla ANTES de completar esa sub-fase — más difícil de diagnosticar (¿el `User` se creó o no, si `finalize` devolvió `500`?) |
| `employeeMapping` necesita `User.id` YA resuelto | Sí — `employeeMapping` (Zod `Record<string,string>`) exige el `id` real antes de armar el body de `finalize` | Requeriría un tipo de placeholder temporal en el contrato (ej. `{__create__: true, name}`) — contradice §3 (mapping final sigue siendo `Record<string,string>`) y complica innecesariamente el esquema |
| Atomicidad de Reconstruction | Sin cambio — Better Auth NUNCA participa de la transacción de `deleteOperationalData()` en ningún caso (ver §9) | Sin cambio tampoco — mismo problema, solo que ahora la creación compite con el resto de fases no-transaccionales de `executeReconstruction` |

**Recomendación explícita: creación INMEDIATA**, antes de `Continuar` en `EmployeeMappingStep`. Es más simple, reutiliza el patrón de botón-deshabilitado ya existente en el proyecto, mantiene el contrato final como `Record<string,string>` sin inventar un tipo intermedio que viaje hasta el servidor, y no introduce ninguna ventana de atomicidad nueva (Better Auth de todos modos nunca puede participar de la transacción Prisma — diferir la creación no arregla eso, solo la mueve).

---

## 5. Candidatos de eliminación

**Regla exacta:** `candidatos = todos los User NO-ADMIN` **menos** `new Set(Object.values(employeeMappingFinal))`. Basado en `User.id` **usados por el mapping final**, no en si el `name` aparece en `sellerNames` — exactamente como pide el pedido (`ALICIA ACEVEDO`→Alicia, `ANGELICA`→Alicia: Alicia SÍ es destino del mapping vía dos claves distintas, así que Alicia nunca es candidata; `ANGELICA` como `User` separado no es destino de ninguna clave, así que SÍ es candidata).

**Dónde calcularlo:** **server-side**, dentro del handler de `.../ejecutar/finalize` (o un endpoint de solo lectura previo, `GET .../reconstruccion/candidatos-eliminacion?mapping=...`, si se quiere mostrar la lista ANTES de llegar a `finalize` — recomendado, para que el ADMIN vea la sección "Empleados no utilizados" en `EmployeeMappingStep` mismo, no recién en la pantalla de confirmación). Nunca confiar en una lista calculada en el cliente y enviada de vuelta como "estos son los no usados" — el cliente solo debe enviar `usersToDelete: string[]` (los que el ADMIN marcó), y el servidor **recalcula** el conjunto de no-usados de forma independiente para validar que cada `id` en `usersToDelete` de verdad esté fuera del mapping final (guardia de §8).

---

## 6. Relaciones/FKs de `User` — tabla completa

Confirmado por `grep -n "User\b" prisma/schema.prisma` — exactamente 5 relaciones en todo el schema, ninguna más:

| Modelo | Campo FK | Tipo | Nullable | `onDelete` | ¿`deleteOperationalData()` la vacía? |
|---|---|---|---|---|---|
| `Session` | `userId` | `String` | No | `Cascade` (`schema.prisma:93`) | No — pero se auto-borra en cascada al eliminar el `User` |
| `Account` | `userId` | `String` | No | `Cascade` (`schema.prisma:115`) | No — mismo, auto-cascada |
| `InventoryMovement` | `userId` | `String` | No | *(sin especificar → Restrict/NoAction default)* | **Sí** (`reconstruction.service.ts:127`) |
| `Shift` | `cashierId` | `String` | No | *(sin especificar → Restrict/NoAction default)* | **Sí** (`reconstruction.service.ts:128`) |
| `CashWithdrawal` | `userId` | `String` | No | *(sin especificar → Restrict/NoAction default)* | **Sí** (`reconstruction.service.ts:126`) |

**Conclusión:** tras `deleteOperationalData()`, las ÚNICAS filas que aún referencian cualquier `User` son `Session`/`Account` — y ambas cascadan automáticamente al eliminar el `User` (a nivel de constraint de Postgres, generado por Prisma). No existe ninguna sexta relación oculta.

**¿En qué punto exacto pueden eliminarse los `User` seleccionados sin violar FK?** Inmediatamente después de que `deleteOperationalData()` retorne exitosamente — en ese momento, TODO `Shift`/`InventoryMovement`/`CashWithdrawal` (de cualquier `User`, no solo de los candidatos) ya fue borrado, así que la FK que hoy bloquea la eliminación de cualquier `User` deja de existir para todos, no solo para los candidatos. No es necesario esperar a después de `syncShifts()`.

---

## 7. Eliminación compatible con Better Auth

**Mecanismo correcto: `auth.api.removeUser({ body: { userId } }, { headers })`** — endpoint admin real, confirmado en `node_modules/better-auth/dist/plugins/admin/routes.mjs:686-714` (better-auth@1.4.12 instalado):

- Requiere permiso `{user:["delete"]}` — **ya otorgado** al rol `ADMIN` de este proyecto (`adminAc` incluye `"delete"` en `defaultStatements.user`, `node_modules/better-auth/dist/plugins/admin/access/statement.mjs`; `lib/auth.ts:26-30` mapea `ADMIN: adminAc`). Cero configuración adicional necesaria.
- Guardia propia: `if (ctx.body.userId === ctx.context.session.user.id) throw ... YOU_CANNOT_REMOVE_YOURSELF` — el "ADMIN nunca puede eliminarse a sí mismo" **ya está resuelto por Better Auth mismo**, no hace falta reimplementarlo (aunque SÍ conviene una guardia redundante server-side propia, ver §8, para dar un mensaje de error más claro antes de intentar la llamada).
- Comportamiento documentado explícito: *"Delete a user and all their sessions and accounts. Cannot be undone."* — usa `ctx.context.internalAdapter.deleteUser(userId)` (adapter interno de Better Auth), NO un `prisma.user.delete()` crudo.
- **`prisma.user.delete()` directo:** técnicamente funcionaría igual a nivel de datos (mismas cascadas de Postgres) pero **saltaría** cualquier hook/lógica interna que Better Auth pudiera tener atada a su adapter (invalidación de caché de sesión, eventos, futuras validaciones del plugin) — el proyecto ya sigue la convención de nunca usar `prisma.user.*` directo para altas/bajas de identidad (`users.service.ts:95-98`, comentario explícito sobre este mismo criterio para creación). Usar `auth.api.removeUser` es consistente con esa convención ya establecida.

**Headers requeridos:** los reales de la request entrante (mismo patrón que `setUserPassword`/`createUser` ya usan en `users.service.ts` — sesión ADMIN activa vía `headers()` de Next.js).

---

## 8. Guardias server-side obligatorias

Para cada `User.id` en `usersToDelete`, el handler de `finalize` debe rechazar la request COMPLETA (sin borrar ningún `User`, sin ejecutar `executeReconstruction`) si CUALQUIERA falla:

1. **No existe** — `prisma.user.findUnique({where:{id}})` retorna `null`.
2. **`role === "ADMIN"`** — rechazado incondicionalmente (decisión de producto: nunca eliminar ADMINs desde este flujo).
3. **Es el ADMIN autenticado** (`id === session.user.id`) — redundante con la guardia propia de `auth.api.removeUser`, pero da un mensaje claro ANTES de intentar la llamada (evita que el ADMIN se enseñe un error genérico de Better Auth).
4. **Es destino del `employeeMapping` final** — `Object.values(employeeMapping).includes(id)` — este es el guard central, recalculado server-side (§5), nunca confiando en lo que el cliente marcó como "no usado".
5. **Tiene cualquier referencia que NO será eliminada por `deleteOperationalData()`** — por la tabla de §6, esto **estructuralmente no puede pasar** para `Shift`/`InventoryMovement`/`CashWithdrawal` (todas se vacían primero, sin excepción, para TODOS los `User`) — la única guardia real y necesaria aquí es de completitud de orden (ejecutar la eliminación DESPUÉS de confirmar que `deleteOperationalData()` ya retornó éxito, nunca antes).
6. **Duplicados en `usersToDelete`** — normalizar con `[...new Set(usersToDelete)]` antes de procesar; el contrato Zod no lo previene por sí solo (`z.array(z.string())` permite duplicados).

**¿Puede eliminarse un `EMPLEADO` activo?** **Sí, por decisión de producto ya fijada por el pedido** — aparece como candidato igual que uno inactivo, con advertencia visual especial en la UI (ver §11), y el backend aplica las MISMAS 6 guardias de arriba (ninguna guardia adicional por estar activo — la única diferencia es visual/UX, no de autorización).

---

## 9. Atomicidad y fallo parcial

**Confirmado (sin reauditar el resto de la arquitectura, solo lo pedido):**

- `deleteOperationalData()` es la ÚNICA fase con `prisma.$transaction()` propia (`reconstruction.service.ts:125-132`) — todas las demás fases (`resetProducts`, `syncMembers`, `syncShifts`, `restoreProductSalePrices`, `finalizeSyncMode`) corren como pasos independientes, **sin** una transacción envolvente sobre todo `executeReconstruction()`. Cada rama de fallo ya devuelve explícitamente *"Restaura desde el respaldo para recuperar el estado anterior"* — el backup pre-Reconstruction es, hoy, el ÚNICO mecanismo de recuperación ante fallo parcial. Esto es un hecho ya existente, no introducido por este diseño.

- **¿La eliminación de `User` debe estar en la misma transacción que `deleteOperationalData()`?** Técnicamente POSIBLE (ambas son operaciones Prisma puras, ningún paso de Better Auth de por medio si se usara `tx.user.delete()` — pero eso violaría la convención de "nunca `prisma.user.*` directo", §7) — o SEPARADA inmediatamente después (recomendado): dado que tras `deleteOperationalData()` NINGÚN `User` tiene ya referencias bloqueantes (§6), no hay ninguna ganancia de seguridad en forzarlas a la misma transacción; separarlas permite seguir usando `auth.api.removeUser` (la vía correcta, §7) sin pelear con el límite de abajo.

- **¿La creación diferida de nuevos empleados puede estar en esa transacción?** No aplica — este diseño recomienda creación INMEDIATA (§4), antes de que exista ninguna transacción de Reconstruction.

- **¿Pueden las APIs admin de Better Auth participar en una transacción Prisma?** **No.** `auth.api.createUser`/`auth.api.removeUser` usan el adapter Prisma configurado en `lib/auth.ts:9-11` (`prismaAdapter(prisma, {...})`) — una instancia de cliente completamente separada del callback `tx` que recibe `prisma.$transaction(async (tx) => ...)`. No hay ningún mecanismo (documentado ni encontrado en el código instalado) para inyectar un `tx` en llamadas de Better Auth.

- **¿Usar Better Auth rompe atomicidad con el pipeline actual?** **No la rompe — la extiende con el mismo patrón ya aceptado.** El pipeline YA NO es atómico de punta a punta (ver primer punto de esta sección); agregar un paso más no-transaccional (eliminar/crear `User`s vía Better Auth) es consistente con el modelo de fallo YA existente ("si algo falla a mitad de camino, restaura desde el backup"), no una regresión nueva.

**Contradicción documentada (tal como pide el pedido, sin inventar rollback):** "crear/eliminar `User` vía Better Auth" es estructuralmente incompatible con "atomicidad total dentro de Reconstruction" — pero esa incompatibilidad YA EXISTE hoy entre `deleteOperationalData()` y el resto de las fases (`syncMembers`/`syncShifts` tampoco están en la transacción). Este diseño no resuelve ni empeora ese límite preexistente; solo hereda el mismo backup-como-red-de-seguridad para dos pasos adicionales.

---

## 10. Contrato mínimo para `finalize`

**No adoptar `employeesToCreate` como concepto de contrato** (por la recomendación de creación inmediata, §4) — al llegar a `finalize`, todo empleado ya fue creado y ya tiene `User.id` real dentro de `employeeMapping`. El contrato nuevo se reduce a:

```ts
// Extensión de FinalizeBodySchema en app/api/migracion/reconstruccion/ejecutar/finalize/route.ts
{
  importId: string,
  members: MemberPreviewType[],       // sin cambio
  employeeMapping: Record<string,string>,  // sin cambio de forma — ya incluye los User.id recién creados
  reimportProducts: boolean,          // sin cambio
  usersToDelete: string[],            // NUEVO — array de User.id, normalizado (Set) y validado server-side (§8)
}
```

- **Qué se stagea:** nada nuevo — `usersToDelete` es pequeño (nombres/ids, no `shifts`), viaja directo en el body de `finalize` igual que `employeeMapping` hoy.
- **Qué llega solo al `finalize`:** `usersToDelete` completo — no tiene sentido "sub-batchear" una lista de IDs a eliminar.
- **Qué debe validarse con Zod:** `usersToDelete: z.array(z.string().min(1))` — la validación de NEGOCIO (existe, no-ADMIN, no-self, no-destino-del-mapping) es lógica server-side explícita (§8), no expresable en el esquema Zod por sí sola.
- **Cómo evitar `role=ADMIN` en creación:** el endpoint de creación (§4) simplemente no acepta `role` como campo de entrada — se fija server-side, sin excepción; no es una validación "rechazar si viene ADMIN", es "el campo no existe en el contrato de entrada".
- **Cómo evitar email/password arbitrarios:** mismo principio — el endpoint de creación no acepta `email`/`password` en el body; ambos se generan server-side.
- **Cómo representar aliases que convergen:** no requiere representación especial en el contrato — dos claves de `employeeMapping` distintas (`"ALICIA ACEVEDO"`, `"ANGELICA"`) simplemente comparten el mismo valor `User.id`. `Record<string,string>` ya lo soporta sin cambios (confirmado, §3).

---

## 11. UX propuesta — `EmployeeMappingStep`

- **Match exacto, activo o inactivo:** badge `Auto-mapeado`, preseleccionado — con el fix de §2 (endpoint sin filtro `isActive`), esto cubre a Alicia/Angélica automáticamente en corridas futuras si sus nombres vuelven a aparecer.
- **Sin match:** badge `Pendiente`, `<Select>` con TODOS los usuarios no-ADMIN (activos e inactivos, con indicador visual Activo/Inactivo por opción), más una acción `Crear nuevo empleado`.
- **Selección manual:** badge `Mapeado`.
- **Crear nuevo (inmediata, §4):** click abre una confirmación mínima en línea (nombre precargado = `sellerName`, editable) → al confirmar, `POST` al endpoint nuevo → éxito: badge `Creado`, fila mapeada al nuevo `User.id`, lista de opciones del `<Select>` de TODAS las filas se actualiza en memoria (sin recargar preview, sin volver a subir Excel — confirmado viable: `users` es simple estado de React en `InconsistencyStep`, un `setUsers([...users, nuevoUser])` basta).
- **Aliases:** sin advertencia — dos filas con el mismo `User.id` de destino es un estado válido y esperado, no un error.
- **Sección nueva, SOLO en Reconstruction, después de mapping completo:** `"Empleados no utilizados en esta reconstrucción"` — lista = candidatos de §5 (obtenidos del endpoint de solo lectura recomendado en §5, recalculado cada vez que el mapping cambia). Por candidato: checkbox (ninguno preseleccionado), nombre, badge Activo/Inactivo, y advertencia visual reforzada si está Activo (ej. banner ámbar/rojo "Este empleado está activo — verifica antes de eliminar"). ADMINs nunca aparecen en esta lista (filtrados server-side en el cálculo de candidatos, §5/§8).
- **Botón Continuar:** bloqueado solo por `totalBlocking > 0` (mapping pendiente) — igual que hoy. La sección de eliminación es 100% opcional; cero checkboxes marcados no bloquea nada.

---

## 12. Caso Alicia/Angélica — resultado esperado con este diseño

1. `EmployeeMappingStep` con el fix de §2: `ALICIA ACEVEDO` auto-mapea a `User` Alicia (match exacto, ahora visible pese a `isActive:false`) → badge `Auto-mapeado`.
2. `ANGELICA` — si el `User` "ANGELICA" (nombre literal) sigue existiendo, TAMBIÉN auto-mapearía a SU PROPIO `User`, no al de Alicia (porque el auto-mapeo es por coincidencia exacta de nombre, no por "misma persona"). Para lograr `ANGELICA → Alicia Acevedo` como pide el caso real, el ADMIN debe **sobrescribir manualmente** esa fila seleccionando "Alicia Acevedo" en el `<Select>` — el sistema nunca infiere alias por similitud (explícitamente prohibido por el pedido) → badge pasa de `Auto-mapeado` a `Mapeado`.
3. Tras completar mapping: `Object.values(employeeMapping)` incluye `User.id` de Alicia dos veces (vía las dos claves) — Alicia **no** aparece en "Empleados no utilizados". El `User` "ANGELICA" (id distinto, ya no destino de ninguna clave) **sí** aparece como candidato, checkbox sin marcar por default.
4. `ADMINISTRADOR → Nacho`: selección manual existente, sin cambio de mecanismo — sigue siendo un `<Select>` manual, el sistema no autoinfiere esto tampoco.
5. `GAEL → GAEL GARCIA PEREZ`: mismo mecanismo — selección manual (no hay match exacto entre "GAEL" y "GAEL GARCIA PEREZ").
6. Si el ADMIN marca el checkbox de "ANGELICA" y confirma: al llegar a `finalize`, `usersToDelete=["<id de ANGELICA>"]` pasa las 6 guardias de §8 (existe, no-ADMIN, no-self, no-destino-del-mapping-final, sin referencias bloqueantes tras `deleteOperationalData()`, sin duplicados) → se elimina vía `auth.api.removeUser` inmediatamente después de `deleteOperationalData()`, antes de `syncMembers`/`syncShifts`.

**Verificado únicamente en lectura contra la DB real** (sin cambios): existen hoy `User` "ALICIA ACEVEDO" (`isActive:false`) y "ANGELICA" (`isActive:false`) con `id`s distintos — el diseño de arriba opera correctamente sobre ese estado real tal como está.

---

## Recomendación (máximo 3 acciones)

1. **Fix del filtro `isActive` en `GET /api/migracion/users`** (§2) — quitar `where:{isActive:true}`, agregar `role`/`isActive` al `select`. Cambio acotado, bajo riesgo, resuelve la recurrencia del bug de la investigación previa incluso antes de construir el resto.
2. **Endpoint nuevo de creación de empleado histórico** (§4) reutilizando `UsersService.createEmployee()` + `setEmployeeActive()`, con `role`/`password`/`email` fijados server-side — nunca aceptados del cliente.
3. **Extender `EmployeeMappingStep` + contrato de `finalize`** con `usersToDelete` (§10/§11), guardias server-side (§8), y la sección "Empleados no utilizados" — solo visible en Reconstruction.

## Flujo BMAD por acción

| Acción | Clasificación |
|---|---|
| 1. Fix filtro `isActive` en `/api/migracion/users` | **`/bmad-quick-dev`** — cambio de una línea + ampliar `select`/tipo `UserRef`, sin ambigüedad de diseño. |
| 2. Endpoint de creación de empleado histórico | **`/bmad-create-story` → `/bmad-dev-story`** — nuevo endpoint, nuevo esquema Zod, generación de email/password interno (decisión de convención nueva a documentar en la Story), reutiliza Service existente pero con contrato propio. |
| 3. `usersToDelete` + guardias + UX de eliminación en el wizard | **`/bmad-create-story` → /bmad-dev-story`** — toca contrato de `finalize`, lógica de guardias server-side de seguridad, y una superficie de UX nueva (checklist de eliminación) — no es ambigua en diseño (este documento ya la resolvió), pero es demasiado alcance para `/bmad-quick-dev` (múltiples archivos, una tabla de guardias de seguridad que debe implementarse y probarse con cuidado). |

Las acciones 2 y 3 pueden ser la MISMA Story (mismo alcance de producto: "ciclo de vida de empleados dentro de Reconstruction") o dos Stories secuenciales — decisión a tomar en `/bmad-create-story`, no aquí.

**Status:** Concluded — diseño completo con evidencia de código real (better-auth@1.4.12 instalado, schema Prisma completo, Services existentes), sin gaps de evidencia bloqueantes. Nada implementado, nada escrito en DB, ningún Sync/Reconstruction ejecutado.
