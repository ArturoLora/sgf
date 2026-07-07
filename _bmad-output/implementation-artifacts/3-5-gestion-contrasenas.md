# Story 3.5: Gestión de Contraseñas (Administrador y Autoservicio)

Status: review

## Story

As an administrador de SGF o como empleado,
I want que el administrador pueda reiniciar la contraseña de cualquier empleado, y que cada empleado pueda cambiar la suya propia,
So that el acceso se mantenga seguro sin depender de que el administrador conozca contraseñas ajenas.

## Alcance

**Incluido:**
- Reinicio de contraseña por ADMIN desde `/usuarios` — habilita el botón `KeyRound` (hoy `disabled`) en `EmployeeTable`, abre un modal con un solo campo (nueva contraseña), llama `auth.api.setUserPassword()` vía un endpoint dedicado nuevo `PATCH /api/usuarios/[id]/password`.
- Cambio de contraseña propio (autoservicio) — página nueva `/mi-cuenta`, accesible a cualquier empleado autenticado (ADMIN o EMPLEADO), con un formulario (contraseña actual + nueva contraseña) que llama `authClient.changePassword()` directo desde el cliente, sin pasar por ninguna ruta ADMIN-only.
- Punto de entrada nuevo a `/mi-cuenta` desde `Header` (hoy solo tiene nombre/rol + botón "Salir", sin ningún menú de cuenta).

**No incluido (fuera de alcance, no reabrir):**
- Eliminación física de empleados — ya excluida por decisión aprobada en Story 3.4 (AC8) / FR-U7. Esta historia no agrega ningún botón ni endpoint `DELETE`.
- Cualquier cambio a `User.isActive`, a `setEmployeeActive()`, o al botón `Power`/`PowerOff` de `EmployeeTable` — ya cerrado por Story 3.4.
- Cualquier cambio a `app/login/page.tsx` o al flujo de inicio de sesión.
- Cualquier avance de Epic 1/2 (Migración/Reconstrucción) — `modules/migration/`, `app/api/migracion/` no se tocan.
- Edición de otros campos del empleado (nombre, correo, rol, teléfono, notas) desde el modal de reinicio de contraseña — ese modal hace una sola cosa; `EditarEmpleadoModal` (Story 3.3) no se modifica ni se fusiona con este flujo.

## Hallazgos de análisis (verificados contra `better-auth@1.4.12` real instalado y código actual)

| # | Hallazgo | Evidencia | Restricción que impone sobre esta historia |
|---|----------|-----------|---------------------------------------------|
| H1 | `auth.api.setUserPassword()` usa `adminMiddleware` (mismo middleware que `revokeUserSessions()` en Story 3.4, H1) — exige incondicionalmente una sesión resoluble desde `headers`. El plugin `admin` ya está configurado correctamente en `lib/auth.ts` (`roles: {ADMIN: adminAc, EMPLEADO: userAc}`, fix de Story 3.1) — sin eso, `setUserPassword` rechazaría con `FORBIDDEN` a cualquier sesión `ADMIN` real (mismo hallazgo que ya cerró Story 3.1). | `node_modules/better-auth/dist/plugins/admin/routes.mjs:734-770` (`setUserPassword`, usa `ctx.context.session.user.id`/`role` vía `hasPermission`, sin guard alternativo) | El service **debe** llamar `auth.api.setUserPassword({ headers: await headers(), body: { userId: id, newPassword } })` — headers reales del ADMIN que ejecuta la acción, mismo patrón exacto que `revokeUserSessions()` en Story 3.4. |
| H2 | `setUserPassword()` **ya valida** `minPasswordLength`/`maxPasswordLength` internamente (`ctx.context.password.config`) y lanza `APIError("BAD_REQUEST", {message: BASE_ERROR_CODES.PASSWORD_TOO_SHORT})` si la nueva contraseña es más corta que 6 caracteres (`minPasswordLength: 6` en `lib/auth.ts`, FR-U9 ya vigente desde Story 3.1). | `node_modules/better-auth/dist/plugins/admin/routes.mjs:757-763` | El service **no reimplementa** la validación de longitud — solo captura el `APIError` de Better Auth y lo traduce a un mensaje claro (mismo patrón que `createEmployee()` captura "already exists" en Story 3.3). No agregar un `z.string().min(6)` adicional en el Zod schema de este endpoint sería inconsistente con "no reimplementar" — **sí** se agrega esa validación en el Zod schema (defensa en el borde de la API, estándar del proyecto — ver `CreateEmployeeInputSchema`), pero el mensaje de error real ante un valor que la pase en el cliente y falle en Better Auth de todos modos debe venir de la captura del `APIError`, no de una segunda regla propia. |
| H3 | `authClient.changePassword()` NO es parte del plugin `admin` — es una ruta **core** de Better Auth (`POST /change-password`, `node_modules/better-auth/dist/api/routes/update-user.mjs:79-89`), montada automáticamente por el catch-all ya existente (`app/api/auth/[...all]/route.ts`, `toNextJsHandler(auth)`). Body: `{currentPassword, newPassword, revokeOtherSessions?}`. Usa `sensitiveSessionMiddleware` — exige sesión válida de **cualquier rol**, no `adminMiddleware`. | `node_modules/better-auth/dist/api/routes/update-user.mjs:79-89`; `app/api/auth/[...all]/route.ts` (handler ya montado) | **No se crea ningún endpoint nuevo en `app/api/` para el autoservicio** — el formulario de "Mi Cuenta" llama `authClient.changePassword()` directo desde el componente cliente (patrón idéntico a `authClient.signOut()` ya usado en `Header.tsx`). Esto cumple literalmente el AC de `epics.md` ("sin pasar por ninguna ruta ADMIN-only"). |
| H4 | No existe ninguna página `/mi-cuenta` ni ningún menú de cuenta en `Header.tsx` (hoy solo renderiza nombre/rol + botón "Salir", sin dropdown). `grep` de "Mi Cuenta"/"changePassword" en todo `app/`/`lib/`/`components/` → cero resultados. | `components/layout/header.tsx:26-64` (sin dropdown), búsqueda global sin resultados | Se crea una página nueva (`app/(dashboard)/mi-cuenta/page.tsx`) protegida con `requireAuth()` (no `requireAdmin()` — cualquier rol autenticado, FR-U4) y un botón/link nuevo en `Header.tsx` junto al botón "Salir" existente — sin instalar ningún componente de dropdown/menú nuevo (mismo criterio que Story 3.4 H4: no agregar dependencias/abstracciones no usadas en el resto del proyecto). |
| H5 | La eliminación física de empleados ya fue decidida y cerrada en Story 3.4 (AC8, basada en FR-U7) — no es ambigüedad nueva de esta historia. | `_bmad-output/implementation-artifacts/3-4-activacion-desactivacion-empleados.md` AC8; `epics.md` FR-U7 | Esta historia no reabre esa decisión — se restablece aquí solo como recordatorio de alcance, no como hallazgo nuevo a resolver. |
| H6 | El patrón de endpoint dedicado por acción (`[id]/estado/route.ts` para estado, Story 3.4) ya está establecido — evita sobrecargar `PATCH /api/usuarios/[id]` (edición de campos, Story 3.3) con una responsabilidad distinta. `requireActiveAdminApi()` (creado en Story 3.4, consolida sesión+rol+`isActive` del solicitante) ya es el guard estándar de las 4 rutas de `/api/usuarios/*`. | `app/api/usuarios/[id]/estado/route.ts`; `lib/require-role.ts::requireActiveAdminApi()` | El endpoint nuevo de reinicio de contraseña sigue el mismo patrón exacto: `app/api/usuarios/[id]/password/route.ts`, `PATCH`, `requireActiveAdminApi()` como único guard — sin reinventar autorización. |

## Acceptance Criteria

### Reinicio de contraseña por administrador

1. **Given** el admin hace clic en `KeyRound` sobre un empleado desde `/usuarios`,
   **When** se abre el modal y el admin ingresa una nueva contraseña de al menos 6 caracteres y confirma,
   **Then** el sistema llama `auth.api.setUserPassword({headers, body:{userId, newPassword}})` — sin necesidad de conocer ni pedir la contraseña anterior del empleado — y el modal se cierra mostrando éxito.

2. **Given** el admin ingresa una contraseña de menos de 6 caracteres en el modal de reinicio,
   **When** confirma,
   **Then** el formulario rechaza la operación con un mensaje claro (validación de borde en el cliente/Zod) **antes** de llamar a la API; si por cualquier vía el valor llegara a `setUserPassword()` de todos modos, el `APIError PASSWORD_TOO_SHORT` de Better Auth se traduce a un mensaje claro sin cambiar la contraseña actual (H2).

3. **Given** el reinicio de contraseña se ejecuta sobre un empleado (activo o inactivo),
   **When** se completa,
   **Then** no se toca `User.isActive` ni ningún otro campo del empleado — el reinicio es independiente del estado operativo (mismos dos ejes ya establecidos en Story B1/D2 para otros dominios: aquí, contraseña vs. `isActive` son ejes distintos).

### Cambio de contraseña — autoservicio

4. **Given** cualquier empleado autenticado (ADMIN o EMPLEADO) navega a `/mi-cuenta`,
   **When** ingresa su contraseña actual y una nueva contraseña válida (mínimo 6 caracteres), y confirma,
   **Then** el sistema llama `authClient.changePassword({currentPassword, newPassword})` — sin pasar por ninguna ruta ADMIN-only ni por `/api/usuarios/*`.

5. **Given** un empleado ingresa una contraseña actual incorrecta en `/mi-cuenta`,
   **When** intenta cambiarla,
   **Then** el sistema rechaza la operación con un mensaje claro (Better Auth responde error de credencial inválida; el formulario lo muestra sin redirigir ni cerrar la sesión).

6. **Given** un empleado sin sesión válida intenta acceder a `/mi-cuenta` directamente por URL,
   **When** carga la página,
   **Then** `requireAuth()` lo redirige a `/login` (mismo mecanismo que protege el resto del dashboard) — la página es accesible a cualquier rol autenticado, no solo ADMIN.

### Autorización y errores (reinicio por admin)

7. **Given** `PATCH /api/usuarios/[id]/password` recibe una request sin sesión válida, con sesión `EMPLEADO`, o con sesión ADMIN pero `isActive:false`,
   **When** se invoca,
   **Then** responde `401`/`403` vía `requireActiveAdminApi()` — mismo patrón ya usado por `/api/usuarios/[id]/estado`.

8. **Given** el `id` de la request no corresponde a ningún empleado existente,
   **When** se invoca `PATCH /api/usuarios/[id]/password`,
   **Then** responde `404` con un mensaje claro ("Empleado no encontrado"), sin exponer detalles internos de Better Auth/Prisma.

### Integridad con Stories 3.1-3.4 y otros Epics

9. **Given** cualquier parte de esta historia ejecuta,
   **When** corre el código,
   **Then** `GET/POST /api/usuarios`, `PATCH /api/usuarios/[id]` (edición), `PATCH /api/usuarios/[id]/estado` (activar/desactivar, Story 3.4), `app/login/page.tsx`, `modules/migration/`, y `app/api/migracion/` no cambian de comportamiento.

10. **Given** el botón `KeyRound` queda habilitado por esta historia,
    **When** se revisa `EmployeeTable.tsx`,
    **Then** el botón `Power`/`PowerOff` (Story 3.4) y `Edit` (Story 3.3) siguen exactamente igual — solo `KeyRound` pierde su `disabled`/tooltip de placeholder.

11. **Given** esta historia se completa,
    **When** se revisa el diff,
    **Then** no existe ningún botón, endpoint, ni función de eliminación física de empleados en ningún archivo tocado (H5/FR-U7 sin reabrir).

## Tasks / Subtasks

- [x] Task 1: Extender `types/api/users.ts` con `ResetPasswordInputSchema` (Zod: `newPassword: z.string().min(6, "...")`) + tipo inferido `ResetPasswordInput` — AC: 1, 2
- [x] Task 2: Extender `modules/users/users.service.ts`:
  - [x] `resetEmployeePassword(id: string, newPassword: string): Promise<Employee>` — verifica que el empleado exista (`Empleado no encontrado` si no), llama `auth.api.setUserPassword({headers: await headers(), body:{userId:id, newPassword}})`, captura `APIError`/errores de Better Auth y los traduce a mensaje claro (H1, H2), retorna el empleado serializado (`EMPLOYEE_SELECT`, reutilizado, sin duplicar) — AC: 1, 2, 3, 8
  - [x] `parseResetPasswordInput` — mismo patrón que `parseSetEmployeeActiveInput` (Story 3.4) — AC: 1, 2
- [x] Task 3: Crear `app/api/usuarios/[id]/password/route.ts` — `PATCH`, guard único `requireActiveAdminApi()` (H6, reutilizado sin duplicar), responde `200` con el empleado o `404`/`400` según el error — AC: 1, 7, 8
- [x] Task 4: Extender `lib/api/users.client.ts` con `resetEmployeePassword(id, newPassword): Promise<ApiResponse<Employee>>` — mismo patrón que `setEmployeeActive` (`fetch` + `handleResponse`) — AC: 1
- [x] Task 5: Crear `app/(dashboard)/usuarios/_components/ResetPasswordModal.tsx` — modal con un solo campo (nueva contraseña + confirmación), `react-hook-form` + `zodResolver(ResetPasswordInputSchema)` (mismo patrón visual que `EditarEmpleadoModal`, sin mezclar sus formularios) — AC: 1, 2
- [x] Task 6: Modificar `EmployeeTable.tsx` — habilitar `KeyRound` (`disabled` → `onClick` real que abre el modal), quitar el tooltip de placeholder, actualizar el comentario de anclaje a Story 3.5 (ya completada) — `Power`/`PowerOff`/`Edit` sin cambios — AC: 1, 10
- [x] Task 7: Modificar `UsuariosManager.tsx` — estado para el empleado en reinicio (`employeeResetPassword`), handler `handleResetPassword`, render de `<ResetPasswordModal>` (mismo patrón que `employeeEditar`/`EditarEmpleadoModal`) — AC: 1
- [x] Task 8: Crear `app/(dashboard)/mi-cuenta/page.tsx` — protegida con `requireAuth()` (no `requireAdmin()`, FR-U4), renderiza `MiCuentaManager` — AC: 4, 6
- [x] Task 9: Crear `app/(dashboard)/mi-cuenta/_components/MiCuentaManager.tsx` (o nombre equivalente) — formulario `react-hook-form` (contraseña actual + nueva + confirmación), llama `authClient.changePassword()` directo (H3, sin cliente API intermedio, sin endpoint propio) — AC: 4, 5
- [x] Task 10: Modificar `components/layout/header.tsx` — agregar botón/link a `/mi-cuenta` junto a "Salir" (sin instalar dropdown nuevo, H4) — AC: 4
- [x] Task 11: Agregar `/mi-cuenta` a `lib/navigation.ts` **solo si** se decide que debe aparecer en el sidebar; si se opta por dejarlo accesible únicamente desde el botón de `Header` (recomendado, evita competir visualmente con las secciones operativas del sidebar), no tocar `dashboardRoutes` — decisión libre del dev, documentar cuál se tomó en Completion Notes.
- [x] Task 12: Verificación manual contra la DB real de desarrollo (ver Dev Notes → Testing standards) — AC: 1-11
- [x] Task 13: `npx tsc --noEmit` y `npm run lint` limpios en todos los archivos tocados/creados; regresión de la suite de smoke tests existente (sin overlap esperado — esta historia no toca lógica pura con smoke tests dedicados)

## Dev Notes

### Reutilización obligatoria (no reinventar)

- **Patrón de endpoint dedicado por acción** (H6): `[id]/password/route.ts` separado de `[id]/route.ts` (edición) y `[id]/estado/route.ts` (activar/desactivar) — misma convención que Story 3.4 ya estableció, no se sobrecarga ningún endpoint existente.
- **`requireActiveAdminApi()`** (`lib/require-role.ts`, creado en Story 3.4) — único guard del endpoint de reinicio. No se crea un guard nuevo.
- **`EMPLOYEE_SELECT`** (`modules/users/users.service.ts`, Story 3.3) — reutilizado para el retorno de `resetEmployeePassword()`.
- **Patrón de modal** (`EditarEmpleadoModal.tsx`) — mismo esqueleto (`Dialog`/`react-hook-form`/`zodResolver`) para `ResetPasswordModal.tsx`, pero **sin fusionar los formularios** — son dos acciones distintas con dos schemas distintos (Alcance, "No incluido").
- **`authClient`** (`lib/auth-client.ts`) — ya existe y ya se usa (`signOut()` en `Header.tsx`); `changePassword()` es un método más del mismo cliente, sin configuración adicional.

### Por qué el autoservicio no tiene endpoint propio en `app/api/`

A diferencia del reinicio por admin (que sí necesita un endpoint propio porque la autorización real está en `requireActiveAdminApi()`, ejecutado server-side), `authClient.changePassword()` ya golpea el catch-all de Better Auth (`app/api/auth/[...all]/route.ts`, existente desde Story 3.1) — ese catch-all **es** la ruta API real; construir un wrapper propio en `app/api/usuarios/` sería una segunda ruta redundante para el mismo caso de uso, y además la habría vuelto (por convención del proyecto) candidata a pasar por `requireActiveAdminApi()`, que es ADMIN-only — exactamente lo que el AC de `epics.md` prohíbe explícitamente para este flujo.

### Sobre `/mi-cuenta` como página nueva

No existe ningún patrón previo de "página de cuenta propia" en el proyecto — es la primera vez que se necesita una ruta autenticada-pero-no-ADMIN-only con su propio formulario. Se usa `requireAuth()` (ya existente, valida sesión + `isActive`, sin chequeo de rol) en vez de `requireAdmin()`. La estructura de carpeta sigue la convención ya establecida (`page.tsx` + `_components/` con el Manager correspondiente), igual que `/socios`, `/usuarios`, etc.

### Arquitectura (P-1 a P-8, `CLAUDE.md`)

- `resetEmployeePassword()` vive en `modules/users/users.service.ts` (mismo Service que `createEmployee`/`updateEmployee`/`setEmployeeActive`) — no se crea un segundo Service para usuarios (P-2, P-8).
- El cambio de contraseña propio **no** pasa por ningún Service de `modules/users/` — es una llamada directa `authClient` → Better Auth, sin lógica de negocio de SGF de por medio (no hay nada que orquestar: Better Auth ya valida credencial actual y aplica la nueva). Esto es coherente con P-7 (UI sin lógica de negocio) solo en el sentido de que la "lógica" completa vive en Better Auth, no en SGF — no hay Service que crear para esto.
- Ninguna llamada nueva a Better Auth además de `setUserPassword` (admin) y `changePassword` (core, cliente) — no se usa `banUser`, `impersonateUser`, ni ningún otro método del plugin `admin`.

### Project Structure Notes

**Archivos a crear:**
- `app/api/usuarios/[id]/password/route.ts`
- `app/(dashboard)/usuarios/_components/ResetPasswordModal.tsx`
- `app/(dashboard)/mi-cuenta/page.tsx`
- `app/(dashboard)/mi-cuenta/_components/MiCuentaManager.tsx`

**Archivos a modificar:**
- `types/api/users.ts` — `ResetPasswordInputSchema`
- `modules/users/users.service.ts` — `resetEmployeePassword`, `parseResetPasswordInput`
- `lib/api/users.client.ts` — `resetEmployeePassword`
- `app/(dashboard)/usuarios/_components/EmployeeTable.tsx` — habilitar `KeyRound`
- `app/(dashboard)/usuarios/_components/UsuariosManager.tsx` — estado + handler + render del modal nuevo
- `components/layout/header.tsx` — link a `/mi-cuenta`
- `lib/navigation.ts` — **solo si** se decide agregar al sidebar (Task 11, opcional)

**Sin archivos nuevos en `modules/users/domain/`** — no hay lógica de filtrado/cálculo pura nueva (mismo criterio que Story 3.4).

### Testing standards summary

Mismo criterio que Stories 3.1-3.4: verificación real es manual y funcional contra la DB de desarrollo — no hay lógica pura nueva que amerite un smoke test dedicado (`resetEmployeePassword` es orquestación Better Auth + Prisma; el autoservicio es una llamada directa a Better Auth sin lógica propia).

**Casos a verificar contra la DB real (dev):**
1. Reiniciar contraseña de un empleado de prueba desde `/usuarios` → login posterior con la contraseña **nueva** funciona; login con la contraseña **anterior** falla.
2. Contraseña de menos de 6 caracteres en el modal → rechazada antes de llegar a la API (validación de cliente); forzar el envío directo a la API con un valor corto → `400` con mensaje claro, contraseña sin cambios.
3. Reiniciar contraseña de un empleado con `isActive:false` → funciona igual (no depende de `isActive`); confirmar que `isActive` no cambió.
4. `PATCH .../password` sin sesión → `401`; con sesión `EMPLEADO` → `403`; con sesión ADMIN pero `isActive:false` → `403` (mismo guard de Story 3.4).
5. `id` inexistente → `404` con mensaje claro.
6. `/mi-cuenta`: empleado cambia su propia contraseña con la actual correcta → éxito, login posterior con la nueva funciona.
7. `/mi-cuenta`: contraseña actual incorrecta → rechazado con mensaje claro, contraseña sin cambios, sesión actual no se cierra.
8. `/mi-cuenta` sin sesión (URL directa) → redirige a `/login`.
9. `/mi-cuenta` con sesión `EMPLEADO` (no ADMIN) → carga normalmente (no es ADMIN-only).
10. Regresión: `GET/POST /api/usuarios`, `PATCH .../[id]` (edición), `PATCH .../estado` (activar/desactivar) sin cambios de comportamiento.
11. Regresión: `GET /api/migracion/users` y cualquier ruta de `/api/migracion/` sin cambios.

`npx tsc --noEmit` y `npm run lint` limpios.

### Riesgos

- **R1**: `/mi-cuenta` es una superficie nueva sin precedente en el proyecto (primera página no-ADMIN-only con formulario propio) — si el patrón de carpeta/Manager no encaja exactamente con la convención existente, es una desviación a documentar en Completion Notes, no a resolver en silencio.
- **R2**: Task 11 (agregar o no `/mi-cuenta` al sidebar) se deja como decisión abierta del dev — cualquiera de las dos opciones cumple los AC; documentar cuál se eligió y por qué.
- **R3**: si `revokeOtherSessions` se pasa como `true` en `changePassword()`, Better Auth retorna un nuevo `token` de sesión que reemplaza al actual — si el formulario no lo maneja (actualizar cookie/sesión), el usuario podría quedar con una sesión inconsistente en el cliente. Se recomienda **no** pasar `revokeOtherSessions` en esta historia (omitir el parámetro, default `false`/no revocar) para evitar ese caso — mantiene la sesión actual intacta tras el cambio, consistente con el AC de `epics.md` que no lo exige.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.5-Gestión-de-Contraseñas] — AC originales (líneas 688-708), FR-U4, FR-U5, FR-U9
- [Source: _bmad-output/implementation-artifacts/3-4-activacion-desactivacion-empleados.md] — patrón de endpoint dedicado, `requireActiveAdminApi()`, AC8/FR-U7 (eliminación fuera de alcance)
- [Source: node_modules/better-auth/dist/plugins/admin/routes.mjs:734-770] — `setUserPassword` real (adminMiddleware, validación de longitud interna)
- [Source: node_modules/better-auth/dist/api/routes/update-user.mjs:79-89] — `changePassword` real (ruta core, `sensitiveSessionMiddleware`, no admin)
- [Source: app/api/auth/[...all]/route.ts] — catch-all de Better Auth ya montado, sirve `changePassword` sin configuración adicional
- [Source: lib/auth.ts] — `minPasswordLength:6`, plugin `admin` con `roles` correctos (Story 3.1)
- [Source: lib/auth-client.ts] — `authClient` ya existente, usado en `Header.tsx`/`app/login/page.tsx`
- [Source: app/(dashboard)/usuarios/_components/EmployeeTable.tsx:39-41,75-83] — botón `KeyRound` a habilitar, comentario de anclaje a esta historia
- [Source: components/layout/header.tsx] — sin dropdown de cuenta, punto de inserción del link nuevo

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5) — `/bmad-dev-story`

### Debug Log References

Verificación funcional completa contra la DB real de desarrollo (Prisma Postgres), corriendo `next dev` local con el engine `debian` forzado (mismo procedimiento de entorno que Stories 3.2-3.4: se removieron temporalmente `libquery_engine-darwin-arm64.dylib.node`/`libquery_engine-rhel-openssl-3.0.x.so.node` de `app/generated/prisma/` —gitignored—, restaurados al terminar). Usuarios reales Nacho/Carlos/Andrew **sin tocar** en ningún momento (confirmado: `updatedAt` de Nacho sin cambios antes/después de la sesión). 2 usuarios de prueba `@sgf.local` (uno ADMIN, uno EMPLEADO) creados vía `UsersService.createEmployee()` y usados para todas las pruebas HTTP reales con cookies de sesión reales (`curl`).

**Reset de contraseña por ADMIN (HTTP real, sesión ADMIN de prueba):**
1. `PATCH /api/usuarios/{empId}/password {newPassword:"NuevaClave456"}` → `200`, `isActive:true` sin cambios ✅ (AC1, AC3)
2. Login con la contraseña **anterior** del empleado de prueba → `401 INVALID_EMAIL_OR_PASSWORD` ✅; login con la **nueva** → `200` ✅ — confirma que `setUserPassword()` realmente cambió la credencial en Better Auth, no solo devolvió éxito simulado.
3. Password corto (`"abc"`) → `400`, rechazado por el `ResetPasswordInputSchema` compartido (Zod, capa de API) con el mensaje "La contraseña debe tener al menos 6 caracteres" ✅ (AC2, primera mitad).
4. **Verificación del mecanismo REAL (no solo nuestro Zod, H2):** se envió una contraseña de 200 caracteres (que el Zod de esta Story no acota por arriba) → Better Auth la rechazó de forma independiente con `400 {"error":"Password too long"}` (su propio `maxPasswordLength`) — confirma que el `catch` del service (`resetEmployeePassword`) no está solo repitiendo nuestra propia regla: cualquier rechazo real de Better Auth se propaga honesto, no se enmascara.
5. `401` sin sesión, `403` con sesión EMPLEADO de prueba, `404` con `id` inexistente (sesión ADMIN real) — los 3 confirmados exactos vía `curl` ✅ (AC7, AC8).

**Autoservicio `/mi-cuenta` (HTTP real, `POST /api/auth/change-password` — ruta core de Better Auth, `Origin` header requerido por su CSRF check, no relacionado con esta Story):**
1. Contraseña actual incorrecta → `400 {"code":"INVALID_PASSWORD"}` ✅ (AC5).
2. Contraseña actual correcta → `200`, `token:null` (sin `revokeOtherSessions`, decisión R3 respetada — no se pasó ese parámetro) ✅ (AC4).
3. Login con la contraseña resultante del autoservicio → `200` ✅ — confirma cambio real, no simulado.
4. `GET /mi-cuenta` con sesión ADMIN de prueba → `200`; con sesión EMPLEADO de prueba → `200` — ambos roles acceden ✅ (AC4 implícito, FR-U4).
5. `GET /mi-cuenta` sin sesión → `307` (redirect a `/login`, sin seguir redirects) ✅ (AC6).

**Regresión Stories 3.2-3.4 (misma sesión ADMIN de prueba):**
- `GET /api/usuarios?search=Test` (3.2) → `200`, listado correcto.
- `PATCH /api/usuarios/{id}` edición de `notes` (3.3) → `200`.
- `PATCH /api/usuarios/{id}/estado` desactivar→reactivar (3.4) → `200`/`200`, `sessionsRevoked:true` en ambos, sin tocar `isActive` desde el flujo de password.

**Limpieza:** ambos usuarios de prueba verificados sin `Shift`/`InventoryMovement`/`CashWithdrawal` (0/0/0 cada uno) y eliminados con `prisma.user.deleteMany()` (cascada `Account`/`Session` vía schema). Confirmado `0` residuos tras el borrado. Cookies temporales y logs de `next dev` borrados de `/tmp`.

### Completion Notes List

- **Task 11 (decisión):** `/mi-cuenta` **NO** se agregó a `lib/navigation.ts`/`dashboardRoutes` — decisión humana resuelta antes de implementar (instrucción explícita de este comando). Único punto de entrada: botón "Mi Cuenta" en `Header.tsx`, junto a "Salir".
- El endpoint `PATCH /api/usuarios/[id]/password` sigue el patrón exacto de `[id]/estado/route.ts` (Story 3.4): mismo guard (`requireActiveAdminApi()`), misma forma de catch/status-mapping (`404` si "Empleado no encontrado", `400` en cualquier otro error).
- `resetEmployeePassword()` no toca `isActive` ni ningún otro campo de `User` — solo lee (`findUnique`, para el 404 honesto) y llama a Better Auth. Confirmado en runtime (ver Debug Log).
- El autoservicio (`/mi-cuenta`) **no tiene ningún endpoint propio en `app/api/`** — llama `authClient.changePassword()` directo, que golpea el catch-all de Better Auth ya existente (`app/api/auth/[...all]/route.ts`). Cero código de backend nuevo para ese flujo, tal como diseñó la Story (H3).
- No se pasó `revokeOtherSessions` en `changePassword()` — decisión R3 de la Story respetada explícitamente, sin ampliar alcance.
- `EmployeeTable.tsx`: `Power`/`PowerOff`/`Edit` sin ningún cambio de lógica — solo se tocó el bloque de `KeyRound` (quitado `disabled`, agregado `onClick` real) y el comentario de anclaje (ya no referencia una historia pendiente).
- No se implementó ningún botón/endpoint de eliminación de empleados en ningún archivo del diff (H5/FR-U7 no reabierto).
- No se tocó `app/login/page.tsx` ni ninguna lógica de inicio de sesión.
- No se avanzó ningún otro Epic — `modules/migration/`, `app/api/migracion/` sin cambios.
- Ninguna contradicción técnica real encontrada — la investigación de Better Auth documentada en la Story (H1-H6) coincidió exactamente con el comportamiento observado en runtime.
- `npx tsc --noEmit` y `npm run lint`: limpios en los 10 archivos tocados/creados.
- No se agregó ningún smoke test nuevo dedicado — mismo criterio que Story 3.4: `resetEmployeePassword()` es orquestación Better Auth + Prisma (no lógica pura), y el autoservicio es una llamada directa a Better Auth sin lógica propia de SGF. Verificación real fue funcional contra la DB real (ver Debug Log).

### File List

**Creados:**
- `app/api/usuarios/[id]/password/route.ts`
- `app/(dashboard)/usuarios/_components/ResetPasswordModal.tsx`
- `app/(dashboard)/mi-cuenta/page.tsx`
- `app/(dashboard)/mi-cuenta/_components/MiCuentaManager.tsx`

**Modificados:**
- `types/api/users.ts` — agrega `ResetPasswordInputSchema` y tipo inferido
- `modules/users/users.service.ts` — agrega `resetEmployeePassword`, `parseResetPasswordInput`
- `lib/api/users.client.ts` — agrega `resetEmployeePassword`
- `app/(dashboard)/usuarios/_components/EmployeeTable.tsx` — habilita `KeyRound`
- `app/(dashboard)/usuarios/_components/UsuariosManager.tsx` — estado + handler + `<ResetPasswordModal>`
- `components/layout/header.tsx` — botón/link a `/mi-cuenta`

**Sin cambios (decisión explícita):**
- `lib/navigation.ts` — `/mi-cuenta` no se agregó al sidebar (Task 11)
