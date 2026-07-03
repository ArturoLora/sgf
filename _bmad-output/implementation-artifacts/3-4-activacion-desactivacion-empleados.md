# Story 3.4: Activación y Desactivación de Empleados

Status: review

## Story

As an administrador de SGF,
I want activar o desactivar la cuenta de un empleado,
So that pueda revocar el acceso de alguien que ya no debe usar el sistema, sin borrar su historial.

## Alcance

**Incluido:** desactivar empleado (`User.isActive=false` + `auth.api.revokeUserSessions()`), activar empleado (`User.isActive=true`), endpoint dedicado `PATCH /api/usuarios/[id]/estado`, botón "Power" habilitado en `EmployeeTable` (toggle directo, sin modal de confirmación — ver H4), refresco real del listado tras la acción, guardia de "no dejar el sistema sin ningún ADMIN activo" (ver H5).

**No incluido (Story 3.5):** `setUserPassword()`, `changePassword()`, reinicio de contraseña, cambio de contraseña propio. El botón "Reiniciar contraseña" (KeyRound) en `EmployeeTable` permanece deshabilitado exactamente como quedó en Stories 3.2/3.3.

**No se modifica:** `app/login/page.tsx` (ya recibió su propio patch de hardening en `c2dda79`), ningún archivo de `modules/migration/`/`app/api/migracion/`. `D`/`Z` no forman parte de esta historia. No se ejecuta Sync ni Reconstruction.

## Hallazgos de análisis (verificados contra `better-auth@1.4.12` real instalado y código actual, no contra `epics.md` a ciegas)

| # | Hallazgo | Evidencia | Restricción que impone sobre esta historia |
|---|----------|-----------|---------------------------------------------|
| H1 | `auth.api.revokeUserSessions()` usa `adminMiddleware`, que **exige incondicionalmente** una sesión resoluble desde `headers` (`getSessionFromCtx(ctx)` → `throw APIError("UNAUTHORIZED")` si no hay sesión) — a diferencia de `auth.api.createUser()` (Story 3.3), que solo valida permisos si detecta `ctx.request`/`ctx.headers` pero funciona sin ellos. Confirma exactamente lo que Story 3.1 (H6) ya había verificado empíricamente para este mismo endpoint. | `node_modules/better-auth/dist/plugins/admin/routes.mjs:17-21` (`adminMiddleware`), `:643-669` (`revokeUserSessions`, usa `ctx.context.session.user.id` sin guard) | `deactivateEmployee()`/`setEmployeeActive()` en `modules/users/users.service.ts` **debe** llamar `auth.api.revokeUserSessions({ headers: await headers(), body: { userId } })` — con `headers` reales de la sesión ADMIN que ejecuta la acción, nunca headerless (al revés que `createEmployee()` en Story 3.3). |
| H2 | `auth.api.revokeUserSessions()` internamente hace `internalAdapter.deleteSessions(userId)` — un `DELETE` sin condición de existencia previa. Borrar sesiones de un usuario que ya no tiene ninguna sesión activa no lanza error (0 filas afectadas es un resultado válido). | `node_modules/better-auth/dist/plugins/admin/routes.mjs:667` | La revocación es segura de llamar siempre al desactivar, sin necesidad de verificar antes si el empleado tiene sesiones activas — es idempotente por diseño de la librería. |
| H3 | `requireAuth()` (`lib/require-role.ts`, ya extendido en Story 3.1) valida `isActive` en cada carga de página del dashboard — pero las rutas API creadas en Stories 3.2/3.3 (`app/api/usuarios/route.ts`, `app/api/usuarios/[id]/route.ts`) **no llaman a `requireAuth()`**: hacen su propio chequeo inline de `role === "ADMIN"` vía `prisma.user.findUnique({ select: { role: true } })`, **sin verificar `isActive` del que ejecuta la acción**. Es el mismo patrón ya usado en todas las rutas ADMIN-only de Epic 1/2 (`backup-status/route.ts` y similares) — no es un bug introducido por esta historia, es una convención preexistente en todo el proyecto. | `app/api/usuarios/route.ts`, `app/api/usuarios/[id]/route.ts`, `app/api/migracion/reconstruccion/backup-status/route.ts` — ninguno selecciona/verifica `isActive` | Si la revocación de sesiones fallara (ver H1/AC de fallo parcial) y el ADMIN que ejecutó la desactivación **fuera él mismo el empleado recién desactivado** (caso límite), su sesión ya abierta seguiría pasando el chequeo de estas 3 rutas de `/api/usuarios/*` hasta que expire. **Se decide (mínimo, acotado a esta historia, sin tocar Migración):** las 3 rutas de `app/api/usuarios/*` agregan `isActive` a su `select` y a la condición de rechazo (403 si `!role === ADMIN` **o** `!isActive`) — mismo costo que ya paga `requireAuth()`, cierra el hueco exactamente donde esta historia ya está trabajando, sin tocar ninguna ruta de Migración (fuera de alcance). |
| H4 | No existe ningún componente `AlertDialog` instalado (`components/ui/` no tiene `alert-dialog.tsx`), ningún `window.confirm()`, ni ningún patrón de confirmación para acciones de estado en todo el proyecto — el toggle de `isActive` en Socios ya existente solo ocurre dentro del modal de edición (implícito el "Guardar Cambios" como confirmación), nunca como botón de acción directa con diálogo propio. `epics.md` tampoco exige una confirmación explícita en el AC de esta historia. | `components/ui/` (sin `alert-dialog.tsx`); grep de `window.confirm`/`AlertDialog` en `app/` sin resultados; `epics.md` AC de Story 3.4 (líneas 664-685) | El botón "Power" ejecuta el toggle **directo** al hacer clic (sin modal de confirmación) — instalar un componente de confirmación nuevo sería introducir una dependencia/abstracción no usada en ningún otro lado del proyecto, contra el patrón real existente. |
| H5 | Ni `epics.md` ni la investigación de Epic 3 definen qué pasa si un ADMIN se desactiva a sí mismo, ni si debe protegerse la existencia de al menos un ADMIN activo — **ambigüedad real, sin resolver en las fuentes existentes**. Sí existe un riesgo arquitectónico concreto y ya verificado: `requireAdmin()`/`requireAuth()` son la única puerta al dashboard — si `role=ADMIN AND isActive=true` llega a 0, el sistema queda sin forma de administrarse a través de la UI (solo acceso directo a la base de datos lo repara). | `lib/require-role.ts` (`requireAdmin()`/`requireAuth()` son la única puerta); búsqueda en `epics.md` e investigación sin mención de auto-desactivación ni de "último admin" | **Decisión tomada para esta historia (documentada, no implícita):** se bloquea desactivar cuando el objetivo es `role=ADMIN` y es el **único** `ADMIN` con `isActive=true` restante (`prisma.user.count({ role: "ADMIN", isActive: true })` antes de escribir). Un ADMIN **sí puede** desactivarse a sí mismo si existen otros ADMIN activos — no hay evidencia que justifique prohibir específicamente la auto-desactivación más allá de ese caso. Esta guardia es análoga en espíritu a FR-U7 (nunca dejar al sistema en un estado irrecuperable por la UI) — se marca explícitamente como decisión nueva de esta historia, no una regla ya aprobada en `epics.md`, para que se pueda revisar antes de `/bmad-dev-story` si no se está de acuerdo. |
| H6 | `epics.md` (AC de Story 3.4, línea 670-672) dice "cuando intenta iniciar sesión de nuevo, el sistema lo rechaza" — **impreciso frente al código real**: Better Auth no conoce `isActive` (es un campo 100% custom de SGF) — `signInEmail()` no lo consulta, así que el `POST` de login de un empleado desactivado **sí puede responder 200** con una sesión nueva si sus credenciales son correctas. El rechazo real ocurre un paso después: cualquier página del dashboard llama `requireAuth()`, que sí valida `isActive` y redirige a `/login`. La propiedad de seguridad ("no conserva acceso funcional") se cumple igual, solo que el mecanismo exacto es "login técnicamente aceptado, pero cero páginas funcionan" — no "login rechazado en la pantalla de login". Confirmar/corregir esto requeriría tocar `lib/auth.ts` (hook de sesión) o el login, ambos fuera de alcance explícito de esta historia. | `lib/require-role.ts` (única verificación de `isActive`); `app/login/page.tsx`/`lib/auth-client.ts` (sin lógica de `isActive`); Better Auth no tiene ningún campo `isActive` registrado en su schema (mismo mecanismo que refutó H1 de Story 3.3) | Se corrige el AC en esta historia (ver AC2 abajo) para describir el mecanismo real en vez de repetir la imprecisión de `epics.md`. No se toca `lib/auth.ts` ni el login — el corte de acceso ya es efectivo con el mecanismo existente de Story 3.1. |

## Acceptance Criteria

### Desactivar empleado

1. **Given** un empleado activo (con o sin sesión abierta),
   **When** el admin hace clic en "Power" desde `/usuarios`,
   **Then** `User.isActive` pasa a `false` (escrito primero) y **después** `auth.api.revokeUserSessions()` revoca sus sesiones activas — en ese orden exacto (ver Dev Notes, "Orden de operaciones").

2. **Given** un empleado recién desactivado,
   **When** intenta iniciar sesión de nuevo o navega el dashboard con una sesión previa,
   **Then** el `POST` de login puede responder `200` (Better Auth no conoce `isActive` — ver H6), pero ninguna página del dashboard carga: `requireAuth()` lo redirige a `/login` en el primer intento, y las rutas de `/api/usuarios/*` lo rechazan con `403` si su propia sesión sigue siendo la del empleado desactivado (ver H3).

3. **Given** la revocación de sesiones falla después de que `isActive=false` ya se escribió,
   **When** ocurre ese fallo,
   **Then** la operación **no se revierte** — `isActive=false` es la garantía de seguridad real (ver H6), la revocación es defensa adicional. La respuesta indica `sessionsRevoked: false` para que la UI lo muestre como advertencia, sin bloquear ni deshacer el cambio de estado.

4. **Given** el objetivo de la desactivación es el **único** `ADMIN` con `isActive=true` en el sistema,
   **When** el admin intenta desactivarlo (sea él mismo u otro ADMIN quien ejecute la acción),
   **Then** la operación se rechaza con un mensaje claro ("No puedes desactivar al único administrador activo") — ver H5, decisión nueva de esta historia.

### Activar empleado

5. **Given** un empleado desactivado,
   **When** el admin hace clic en "Power" para reactivarlo,
   **Then** `User.isActive` vuelve a `true` (solo Prisma, sin llamada a Better Auth — no hay sesiones que restaurar, no se toca la contraseña) y el empleado puede iniciar sesión normalmente en su siguiente intento, obteniendo una sesión **nueva** (las anteriores, si fueron revocadas, no se restauran).

6. **Given** un empleado ya activo,
   **When** se solicita activarlo de nuevo (`isActive: true` sobre alguien que ya lo es),
   **Then** la operación responde `200` sin error — idempotente, sin efectos secundarios adicionales.

### Historial y eliminación física

7. **Given** un empleado con turnos, movimientos de inventario, o retiros de caja históricos asociados,
   **When** se desactiva,
   **Then** todo su historial permanece intacto y visible en reportes/cortes — desactivar nunca oculta ni modifica datos históricos (ya reforzado por las FK reales sin cascade, ver investigación de Migración H2/Story 2.3).

8. **Given** cualquier empleado, activo o no,
   **When** el admin busca una acción de "Eliminar" en la interfaz,
   **Then** esa acción no existe — solo "Activar"/"Desactivar" están disponibles (FR-U7). No se agrega ningún endpoint `DELETE`.

### Autorización y errores

9. **Given** `PATCH /api/usuarios/[id]/estado` recibe una request sin sesión válida o con sesión de rol `EMPLEADO`,
   **When** se invoca,
   **Then** responde `401`/`403` con el mismo patrón ya usado en el resto de `/api/usuarios/*` (ahora incluyendo el chequeo de `isActive` del solicitante, ver H3).

10. **Given** el `id` de la request no corresponde a ningún empleado existente,
    **When** se invoca `PATCH /api/usuarios/[id]/estado`,
    **Then** responde `404` con un mensaje claro ("Empleado no encontrado"), sin exponer detalles internos de Prisma.

### Integridad con Stories 3.1-3.3 y Epic 1/2

11. **Given** cualquier parte de esta historia ejecuta,
    **When** corre el código,
    **Then** `GET /api/usuarios` (listado/filtros, Story 3.2), `POST /api/usuarios` y `PATCH /api/usuarios/[id]` (alta/edición, Story 3.3), `app/login/page.tsx`, `modules/migration/`, y `app/api/migracion/` no cambian de comportamiento (salvo el endurecimiento de `isActive` descrito en H3, acotado a los 3 archivos de `/api/usuarios/*`).

## Tasks / Subtasks

- [x] Task 1: Extender `types/api/users.ts` con `SetEmployeeActiveInputSchema` (Zod: `isActive: z.boolean()`) + tipo inferido `SetEmployeeActiveInput` — AC: 1, 5, 6
- [x] Task 2: Extender `modules/users/users.service.ts`:
  - [x] `setEmployeeActive(id: string, isActive: boolean): Promise<{ employee: Employee; sessionsRevoked: boolean }>` — guardia de único ADMIN activo dentro de `prisma.$transaction` (lee `role`/`isActive` del objetivo + cuenta ADMIN activos, rechaza antes de escribir); `isActive=false` primero, `revokeUserSessions()` después con `headers` reales, sin rollback si falla — AC: 1, 3, 4, 5, 6
  - [x] `parseSetEmployeeActiveInput` — mismo patrón que `parseUpdateEmployeeInput` — AC: 1, 5
  - [x] Usuario inexistente → `Error("Empleado no encontrado")` en ambos caminos (activar/desactivar) — AC: 10
- [x] Task 3: Creado `app/api/usuarios/[id]/estado/route.ts` — `PATCH` ADMIN-only, responde `200` con `{ ...employee, sessionsRevoked }` o `404` si no existe — AC: 1, 5, 6, 9, 10
- [x] Task 4: Endurecidos los 3 handlers (`GET`/`POST` en `route.ts`, `PATCH` en `[id]/route.ts`) — ver desviación D1 en Completion Notes: se consolidó el chequeo en `lib/require-role.ts::requireActiveAdminApi()` en vez de duplicar `isActive` en cada archivo, reutilizado también por el endpoint nuevo. Ninguna ruta de `app/api/migracion/` tocada — AC: 9
- [x] Task 5: Extendido `lib/api/users.client.ts` con `setEmployeeActive(id, isActive)` — AC: 1, 5
- [x] Task 6: Modificado `EmployeeTable.tsx` — botón "Power" habilitado (`onClick` real), ícono `Power`/`PowerOff` + `title` dinámico ("Activar"/"Desactivar") según `employee.isActive` — sin modal de confirmación (H4). KeyRound sin cambios — AC: 1, 5, 8
- [x] Task 7: Modificado `UsuariosManager.tsx` — `handleToggleActive` llama `setEmployeeActive`, refresca vía `handleActualizar`; nuevo banner amarillo (`notice`, patrón `bg-yellow-50`/`dark:bg-yellow-950` ya usado en otras partes del dashboard) cuando `sessionsRevoked === false` — AC: 1, 3, 5, 6
- [x] Task 8: Verificación manual contra la DB real — ver Debug Log References
- [x] Task 9: `npx tsc --noEmit` y `npm run lint` limpios; suite completa de smoke tests ejecutada (Task 4 tocó `lib/require-role.ts`, compartido por todo el dashboard) — sin regresión

## Dev Notes

### Orden de operaciones al desactivar (por qué `isActive=false` va primero)

Better Auth y Prisma no comparten transacción (mismo hallazgo raíz que el Critical de Story 3.3) — `setEmployeeActive` con `isActive=false` son, en la práctica, dos escrituras: 1) Prisma `isActive=false`, 2) Better Auth `revokeUserSessions()`. El orden importa para el caso de fallo parcial:

- **`isActive=false` primero, revocación después (elegido):** si la revocación falla, el empleado sigue con `isActive=false` — `requireAuth()` ya bloquea el dashboard en su próxima carga de página, y las rutas endurecidas de `/api/usuarios/*` (Task 4) también lo rechazan. La garantía de seguridad ("no conserva acceso funcional") se mantiene aunque el segundo paso falle. No hace falta compensación/rollback — a diferencia de Story 3.3, aquí el estado tras un fallo parcial es igual de seguro que el estado tras éxito total.
- **Revocación primero, `isActive=false` después (descartado):** si el segundo paso (`isActive=false`) fallara, las sesiones ya estarían revocadas pero el empleado seguiría con `isActive=true` — podría iniciar sesión de nuevo sin ninguna restricción, dejando la revocación sin ningún efecto real. Este orden no ofrece ninguna garantía ante fallo parcial.

Por eso no se necesita ninguna transacción compartida ni compensación — el orden correcto ya es fail-safe por construcción.

### Por qué activar no llama a Better Auth

Reactivar es 100% Prisma (`isActive: true`). No hay sesiones que restaurar (fueron borradas, no pausadas), no se toca `Account.password` — el empleado simplemente vuelve a poder pasar el chequeo de `requireAuth()`/las rutas endurecidas, y debe iniciar sesión de nuevo para obtener una sesión válida. Esto es consistente con que Better Auth no tiene ningún mecanismo de "reactivar sesión" — solo existen o no existen.

### Reutilización obligatoria (no reinventar)

- **Patrón de ruta ADMIN-only con acción de estado dedicada**: la arquitectura ya aprobada en la investigación de Epic 3 (sección 6.6) propone `app/api/usuarios/[id]/estado/route.ts` como endpoint separado del `PATCH /api/usuarios/[id]` de edición de campos (Story 3.3) — no se sobrecarga ese endpoint con `isActive`, que además Story 3.3 excluyó explícitamente de `UpdateEmployeeInputSchema`.
- **Patrón de service**: `setEmployeeActive` sigue la misma forma que `createEmployee`/`updateEmployee` (Story 3.3) — orquesta Better Auth + Prisma en un único método de `modules/users/users.service.ts`, sin crear un segundo camino de escritura.
- **`EMPLOYEE_SELECT`** (ya definido en `users.service.ts`, Story 3.3) se reutiliza para el `select` de `setEmployeeActive` — no se duplica.
- **No instalar `alert-dialog`** ni ningún componente de confirmación nuevo (ver H4) — toggle directo, mismo nivel de fricción que el resto de acciones de un clic ya existentes en el proyecto.

### Arquitectura (P-1 a P-8, `CLAUDE.md`)

- `isActive` sigue siendo el campo de Prisma gestionado por SGF (AD-U2) — no se migra a `banned`/`banUser()` en ningún punto de esta historia.
- `revokeUserSessions()` es la única llamada nueva a Better Auth de esta historia — ninguna otra función del plugin `admin` (`setUserPassword`, `banUser`, `impersonateUser`, etc.) se usa.
- `app/api/usuarios/[id]/estado/route.ts` no contiene lógica condicional de negocio más allá de sesión/rol — la decisión sobre "único admin activo" y el orden de escrituras vive en el Service.

### Project Structure Notes

- Archivos a crear: `app/api/usuarios/[id]/estado/route.ts`.
- Archivos a modificar: `types/api/users.ts`, `modules/users/users.service.ts`, `app/api/usuarios/route.ts`, `app/api/usuarios/[id]/route.ts` (solo el `select`/chequeo de `isActive`, Task 4 — sin tocar lógica de alta/edición ya aprobada en Story 3.3), `lib/api/users.client.ts`, `app/(dashboard)/usuarios/_components/EmployeeTable.tsx`, `app/(dashboard)/usuarios/_components/UsuariosManager.tsx`.
- Sin archivos nuevos en `modules/users/domain/` — no hay lógica de filtrado pura nueva.

### Testing standards summary

Mismo criterio que Stories 3.1-3.3: verificación real es manual y funcional contra la DB de desarrollo, no hay lógica pura nueva que amerite un smoke test dedicado (`setEmployeeActive` es orquestación Better Auth + Prisma). La DB de desarrollo puede usarse libremente (crear/modificar/eliminar usuarios de prueba) — no se protege como producción.

**Casos a verificar contra la DB real:**
1. Desactivar un empleado de prueba activo → `isActive=false` confirmado.
2. Confirmar que sus sesiones existentes fueron revocadas (una sesión obtenida antes de desactivar deja de ser válida para `getSession()`).
3. Confirmar que una request autenticada con esa sesión antigua deja de funcionar contra una ruta protegida.
4. Confirmar que el login del empleado desactivado, si se reintenta, no produce acceso funcional real (login puede responder `200` per H6, pero cualquier página del dashboard redirige — verificar explícitamente esta secuencia, no asumirla).
5. Activar el mismo empleado → `isActive=true` confirmado.
6. Confirmar que conserva la misma contraseña (login exitoso con la contraseña original tras reactivar).
7. Confirmar que necesita una sesión nueva (la anterior, revocada, no revive).
8. Acceso no-ADMIN al endpoint de estado → `403`.
9. `id` inexistente → `404` con mensaje claro.
10. Solicitar el mismo estado que ya tiene (activar ya-activo, desactivar ya-inactivo) → `200`, sin error, idempotente.
11. Intentar desactivar al único ADMIN activo → rechazado con mensaje claro; confirmar que sigue `isActive=true` sin cambios.
12. Escenario controlado de fallo de revocación (reproducible sin operaciones destructivas masivas, ej. forzando temporalmente un error en el `try/catch` como se hizo en el review de Story 3.3) → confirmar que `isActive=false` persiste igual y la respuesta indica `sessionsRevoked: false`.
13. Regresión: `GET /api/usuarios`, alta/edición de Story 3.3, y `GET /api/migracion/users` sin cambios de comportamiento tras endurecer las 3 rutas de `/api/usuarios/*` (Task 4) — un ADMIN activo normal debe seguir pasando todos los chequeos igual que antes.

`npx tsc --noEmit` y `npm run lint` limpios.

### Riesgos

- **R1**: la guardia de "único ADMIN activo" (H5) es una decisión nueva de esta historia, no un requisito explícito de `epics.md` — si el usuario prefiere no tenerla, es un `Task` fácil de remover antes de `/bmad-dev-story`, pero se recomienda mantenerla dado el riesgo real de bloqueo total documentado.
- **R2**: el endurecimiento de `isActive` en las 3 rutas de `/api/usuarios/*` (H3/Task 4) es también una decisión nueva — cambia el comportamiento existente de esas rutas (agrega un caso de rechazo que hoy no existe). El riesgo de NO hacerlo es que la garantía de seguridad de esta historia ("empleado desactivado no conserva acceso funcional") tenga una excepción real y verificable en esas 3 rutas específicas.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.4-Activación-y-Desactivación-de-Empleados] — AC originales (líneas 658-685), AC2 corregido en esta historia (ver H6)
- [Source: _bmad-output/implementation-artifacts/investigations/administracion-usuarios-investigation.md#6.4,6.6] — decisión de revocar sesiones al desactivar, estructura `[id]/estado/route.ts` ya propuesta
- [Source: _bmad-output/implementation-artifacts/3-1-habilitar-admin-plugin-infraestructura.md] — H6 (revokeUserSessions/setUserPassword requieren headers), `roles`/`adminRoles` ya configurados en `lib/auth.ts`
- [Source: _bmad-output/implementation-artifacts/3-3-alta-edicion-empleados.md] — patrón `createEmployee`/`updateEmployee`, Critical de atomicidad Better Auth+Prisma y su resolución (mismo tipo de análisis aplicado aquí)
- [Source: node_modules/better-auth/dist/plugins/admin/routes.mjs:17-21,643-669] — `adminMiddleware`, `revokeUserSessions` real (requiere headers, `deleteSessions` idempotente)
- [Source: lib/require-role.ts] — `requireAuth()`/`requireAdmin()`, única puerta actual al dashboard
- [Source: app/api/usuarios/route.ts, app/api/usuarios/[id]/route.ts] — rutas ADMIN-only reales a endurecer (Task 4)
- [Source: components/ui/ (sin alert-dialog.tsx), grep de confirm() en app/] — evidencia de que no existe patrón de confirmación en el proyecto (H4)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5) — `/bmad-dev-story`

### Debug Log References

Verificación funcional completa contra la DB real de desarrollo (Prisma Postgres). Usuarios reales Nacho/Carlos/Andrew sin tocar; usuarios de prueba `@sgf.local` (uno EMPLEADO, uno ADMIN) creados y eliminados en esta sesión.

**Desactivación:**
1. Empleado de prueba activo, con una sesión abierta previa a la desactivación (`test34-old.txt`).
2. `PATCH /api/usuarios/{id}/estado` con `{isActive:false}` → `200`, `isActive:false`, `sessionsRevoked:true` ✅
3. `GET /api/usuarios?search=...` confirma `isActive:false` en el listado ✅
4. La sesión previa: `getSession()` con esa cookie → `null` (sesión realmente borrada de la tabla `Session`, no solo bloqueada a nivel app) ✅
5. Esa misma sesión intenta `GET /` (dashboard) → `307` a `/login` ✅
6. **H6 confirmado exactamente como predicho la historia**: login del empleado desactivado (`POST /api/auth/sign-in/email`) → `200` (Better Auth no conoce `isActive`, crea una sesión nueva); esa sesión nueva intenta `GET /` → `307` a `/login` igual — el login "funciona" pero el acceso real queda bloqueado en la primera carga de página ✅

**Escenario de fallo de revocación (reproducido de forma controlada, sin apagar la DB a mitad de operación):** se simuló el fallo parcial haciendo `prisma.user.update({isActive:false})` directo sobre un ADMIN de prueba **sin** pasar por `revokeUserSessions()` (equivalente exacto a "la llamada a Better Auth falló"), dejando la sesión existente intacta en la tabla `Session`. Con esa sesión (rol `ADMIN`, `isActive:false`, sesión NO revocada):
- `getSession()` → sesión válida (Better Auth no sabe que está inactivo)
- `GET /api/usuarios` con esa sesión → **`403` "Acceso restringido"** — confirma que el endurecimiento de H3 (`requireActiveAdminApi()`) cierra exactamente el hueco que existía antes: sin el fix, esta misma request habría respondido `200` (el chequeo viejo solo miraba `role`)
- `GET /` con esa sesión → `307` a `/login` (ya bloqueado desde Story 3.1, sin cambios)

**Guardia de único ADMIN activo:**
- Con 2 ADMIN activos (Nacho + un ADMIN de prueba), desactivar uno de los dos → `200`, éxito ✅
- Con Nacho como único ADMIN activo restante, Nacho intenta desactivarse a sí mismo → `400 {"error":"No puedes desactivar al único administrador activo"}`, y se confirmó que su `updatedAt` no cambió (sin escritura parcial) ✅

**Activación:**
- Empleado desactivado → `PATCH .../estado {isActive:true}` → `200`, `isActive:true` ✅
- Idempotente: activar de nuevo (ya activo) → `200` sin error ✅
- Login con la contraseña **original** tras reactivar → `200` (password nunca tocado) ✅
- Idempotente también en desactivar-ya-inactivo → `200` sin error en ambas llamadas consecutivas ✅

**Autorización y errores:**
- `PATCH .../estado` sin sesión → `401`; con sesión `EMPLEADO` (Carlos) → `403`
- `id` inexistente → `404 {"error":"Empleado no encontrado"}`

**Regresión:** `GET /api/usuarios?role=EMPLEADO&isActive=true` (Story 3.2) sin cambios; `PATCH /api/usuarios/{id}` de edición (Story 3.3) sigue funcionando; `GET /api/migracion/users` sin cambios de forma ni comportamiento.

**Limpieza:** los 2 usuarios de prueba se verificaron sin `Shift`/`InventoryMovement`/`CashWithdrawal` y se eliminaron con `prisma.user.delete()` (cascada `Account`/`Session`) vía scripts temporales creados, ejecutados y borrados en esta misma sesión.

**Nota de entorno** (no relacionada con el código, mismo procedimiento que Stories 3.2/3.3): sandbox Linux, se removieron temporalmente los engines `darwin-arm64`/`rhel` de `app/generated/prisma/` (gitignored) para forzar el engine `debian` durante `next dev` local, restaurados al terminar.

### Completion Notes List

- **D1 (desviación real, documentada):** Task 4 pedía endurecer `isActive` "en las 3 rutas" añadiéndolo a su `select`/chequeo inline. En vez de duplicar ese bloque 3 veces (y una 4ta en el endpoint nuevo), se consolidó en `lib/require-role.ts::requireActiveAdminApi()` — mismo archivo que ya centraliza `requireAuth()`/`requireAdmin()` para páginas. Esto además corrigió una duplicación **preexistente** de Story 3.3 (`route.ts` tenía su propio `requireAdminSession()` local, `[id]/route.ts` tenía una copia inline distinta de la misma lógica) — ahora los 4 handlers de `/api/usuarios/*` comparten una sola implementación. `redirect()` (usado por `requireAuth()`/`requireAdmin()` para páginas) no es utilizable en un route handler — `requireActiveAdminApi()` devuelve un `NextResponse` en su lugar, mismo patrón de retorno que ya usaba el `requireAdminSession()` local de Story 3.3.
- **Hallazgo fuera de alcance (no modificado, documentado según instrucción):** 7 rutas de `app/api/migracion/` comparten el mismo patrón "solo verifica `role`, no `isActive`" que tenían las rutas de usuarios antes de este fix: `reconstruccion/preview`, `reconstruccion/validar`, `reconstruccion/backup`, `reconstruccion/backup-status`, `reconstruccion/ejecutar`, `sync-shifts`, `sync-members`. Mismo riesgo teórico que H3, pero **no se tocaron** — fuera de alcance explícito de esta historia (endurecimiento transversal pendiente, a evaluar en una historia aparte si se considera necesario).
- **Límite de concurrencia documentado (ver también Dev Notes):** la guardia de único ADMIN activo usa `prisma.$transaction()` para leer+escribir de forma consistente dentro del mismo proceso, pero bajo el nivel de aislamiento por defecto de Postgres (READ COMMITTED) no hay garantía absoluta frente a dos requests concurrentes desactivando dos ADMIN distintos al mismo tiempo. Cerrar esa ventana por completo requeriría `SERIALIZABLE` o locks explícitos de fila — no implementado, dado el volumen real de administradores de SGF (2-3), documentado como límite conocido en vez de resuelto con infraestructura no solicitada.
- No se implementó ninguna acción fuera de alcance: sin `setUserPassword()`, `changePassword()`, `banUser()`, DELETE físico. KeyRound sigue `disabled` sin `onClick`.
- `app/login/page.tsx` no fue tocado (ya recibió su propio patch en `c2dda79`).
- `npx tsc --noEmit` y `npm run lint`: limpios en los 9 archivos tocados/creados.
- Suite completa de smoke tests: sin regresión — mismos 2 fallos preexistentes de `npm run smoke` (`difference=0 esperado -50`, `difference=75 esperado 25`), confirmados sin overlap con el diff de esta historia.
- No se agregó ningún smoke test nuevo dedicado: `setEmployeeActive` es orquestación Better Auth + Prisma (no lógica pura) — verificación real fue funcional contra la DB real, mismo criterio que Stories 3.1-3.3.

### File List

**Creados:**
- `app/api/usuarios/[id]/estado/route.ts`

**Modificados:**
- `types/api/users.ts` — agrega `SetEmployeeActiveInputSchema` y tipo inferido
- `modules/users/users.service.ts` — agrega `setEmployeeActive`, `parseSetEmployeeActiveInput`
- `lib/require-role.ts` — agrega `requireActiveAdminApi()` (consolidación de auth para rutas API, ver D1)
- `app/api/usuarios/route.ts` — `GET`/`POST` usan `requireActiveAdminApi()` en vez del helper local de Story 3.3
- `app/api/usuarios/[id]/route.ts` — `PATCH` usa `requireActiveAdminApi()` en vez del chequeo inline de Story 3.3
- `lib/api/users.client.ts` — agrega `setEmployeeActive`
- `app/(dashboard)/usuarios/_components/EmployeeTable.tsx` — botón "Power" habilitado
- `app/(dashboard)/usuarios/_components/UsuariosManager.tsx` — `handleToggleActive`, banner de advertencia (`notice`)
