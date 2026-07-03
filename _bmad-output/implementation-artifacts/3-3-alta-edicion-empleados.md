# Story 3.3: Alta y Edición de Empleados

Status: done

## Story

As an administrador de SGF,
I want crear nuevos empleados y editar los datos de los existentes,
So that el catálogo de usuarios de SGF refleje correctamente al personal actual.

## Alcance

**Incluido:** alta de empleado (`auth.api.createUser()` + `prisma.user.update()` inmediato para `phone`/`notes`/`isActive` — ver H1 corregido en Dev Agent Record), edición de `name`/`email`/`phone`/`notes`/`role` vía Prisma directo, validación de correo duplicado en ambos flujos, validación de contraseña mínima en el alta, integración de ambos en `/usuarios` (modal "Nuevo Empleado" + botón "Editar" habilitado en la tabla), refresco real del listado tras cada operación.

**No incluido (Stories 3.4–3.5):** activar/desactivar, revocar sesiones, `setUserPassword()`, `changePassword()`, `banUser()`, cualquier cambio a `isActive` después de la creación. Los botones de "Activar/Desactivar" y "Reiniciar contraseña" en la tabla permanecen deshabilitados exactamente como quedaron en Story 3.2 — esta historia solo habilita el botón "Editar".

**No se modifica:** ningún archivo de `modules/migration/`, `app/api/migracion/`. `D`/`Z` (hallazgo de Migración) no forman parte de esta historia. No se ejecuta Sync ni Reconstruction.

## Hallazgos de análisis (verificados contra `better-auth@1.4.12` real instalado, no contra documentación genérica)

| # | Hallazgo | Evidencia | Restricción que impone sobre esta historia |
|---|----------|-----------|---------------------------------------------|
| H1 | ~~`data` en `createUser()` llega sin filtrar hasta `prisma.user.create()`~~ — **REFUTADO empíricamente durante la implementación** (ver Dev Agent Record). El rastreo original se detuvo en `prisma-adapter.mjs`, pero una capa más arriba (`@better-auth/core/db/adapter`, función `transformInput()`) filtra `data` **antes** de llegar ahí: solo copia campos declarados en `schema[model].fields` (core de Better Auth + `additionalFields` registrados por plugins). `phone`/`notes` nunca se registraron en ningún `schema` — se descartan en silencio. `role` sí persiste porque el plugin `admin` lo declara en su propio `schema` (`mergeSchema`). Confirmado creando un empleado real vía la API: con `data: { phone, notes }` no vacíos, la fila quedó con `phone=null, notes=null`. | `node_modules/@better-auth/core/dist/db/adapter/index.mjs:333-368` (`transformInput`, itera `for (const field in schema[defaultModelName].fields)`); prueba real contra la DB de desarrollo (ver Debug Log References) | `createEmployee()` llama `auth.api.createUser()` solo con `{ email, password, name, role }`, y completa `phone`/`notes`/`isActive` con un `prisma.user.update()` inmediato — ya no "en la misma operación" como decía el AC original de `epics.md`, pero ambas siguen coordinadas en un único método de `modules/users/users.service.ts` (P-2), sin segundo camino de escritura. |
| H2 | `auth.api.createUser()` **no valida `minPasswordLength`** — a diferencia de `setUserPassword()` (`admin/routes.mjs:758-761`, que sí compara `newPassword.length < minPasswordLength`), el handler de `createUser` (`admin/routes.mjs:151-179`) hashea `ctx.body.password` directamente sin ningún chequeo de longitud previo. Un admin podría crear un empleado con contraseña de 1 carácter y Better Auth lo aceptaría. | `node_modules/better-auth/dist/plugins/admin/routes.mjs:172` (sin validación previa) vs. `:758-761` (`setUserPassword` sí valida) | La política de `minPasswordLength: 6` (FR-U9) debe aplicarse **en SGF**, no en Better Auth: `CreateEmployeeInputSchema` (Zod) exige `password.min(6)` — enforcement client + server, no delegable al plugin. |
| H3 | `auth.api.createUser()` valida correo duplicado **de forma nativa** antes de escribir nada: `admin/routes.mjs:164` — `if (await ctx.context.internalAdapter.findUserByEmail(email)) throw new APIError("BAD_REQUEST", { message: ADMIN_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL })` (mensaje interno en inglés: "User already exists. Use another email."). No hay riesgo de registro parcial (el error se lanza antes del `create`). | `node_modules/better-auth/dist/plugins/admin/routes.mjs:164`; `node_modules/better-auth/dist/plugins/admin/error-codes.mjs:7` | `createEmployee()` debe capturar ese error (u otro `APIError`/`Error` de Better Auth) y relanzar un mensaje en español ("El correo electrónico ya está registrado") — no hace falta un chequeo Prisma manual antes de llamar `createUser()`, Better Auth ya lo hace. |
| H4 | El handler de `createUser()` solo ejecuta el chequeo interno de permisos (`hasPermission({ permissions: { user: ["create"] } })`) **si detecta sesión** (`ctx.request`/`ctx.headers`) — `admin/routes.mjs:152-153`. Igual que ya encontró Story 3.1 (H6) para `setUserPassword`/`revokeUserSessions`. Si se llama sin `headers` (server-to-server), el chequeo interno del plugin se salta por completo. | `node_modules/better-auth/dist/plugins/admin/routes.mjs:152-153`; mismo patrón confirmado en Story 3.1 Dev Agent Record (H6) | La ruta `app/api/usuarios/route.ts` (`POST`) es la única barrera real de autorización — debe repetir el mismo patrón sesión→401 / rol→403 ya usado en `GET /api/usuarios` (Story 3.2) **antes** de llamar `auth.api.createUser()`. La llamada a `createUser()` se hace sin `headers`, igual que el patrón ya probado en Story 3.1. |
| H5 | El plugin `admin` expone también `adminUpdateUser` (`admin/routes.mjs:181+`, `auth.api.adminUpdateUser`), que podría editar `name`/`email`/`role` vía Better Auth. **No se usa en esta historia** — la edición de `name`/`email`/`phone`/`notes`/`role` se hace con `prisma.user.update()` directo, tal como especifica el AC de `epics.md` ("los cambios se guardan vía Prisma directo, no son datos de credencial") y AD-U2 (evitar que el plugin gestione campos que Epic 1/2 ya lee directo por Prisma). Usar ambos mecanismos en paralelo crearía dos caminos para el mismo caso de uso (violaría P-8). | `node_modules/better-auth/dist/plugins/admin/routes.mjs:181+`; `epics.md` AC de Story 3.3 (edición); AD-U2 | `updateEmployee()` en `modules/users/users.service.ts` usa exclusivamente `prisma.user.update()` — no se importa `adminUpdateUser` en ningún archivo de esta historia. |
| H6 | Editar `User.email` vía Prisma directo (sin pasar por Better Auth) es seguro — ya verificado en la investigación de Epic 3 (sección 6.4): Better Auth solo usa `email` como clave de búsqueda en `signIn.email()`, no está duplicado en `Account`/`Session` (que se relacionan por `userId`, no por email). Cambiar el correo no invalida sesiones activas ni rompe el login — el siguiente login simplemente debe usar el correo nuevo. | `_bmad-output/implementation-artifacts/investigations/administracion-usuarios-investigation.md` sección 6.4; `prisma/schema.prisma` (`Account`/`Session` relacionan por `userId`) | `updateEmployee()` permite editar `email` libremente vía Prisma, con el mismo chequeo de unicidad que la función `updateUser` del código muerto ya implementaba correctamente (lógica a conservar, ver investigación 1.8). |

## Acceptance Criteria

### Alta de empleado

1. **Given** el admin hace clic en "Nuevo Empleado" desde `/usuarios`,
   **When** completa nombre, correo, contraseña inicial (≥6 caracteres), rol (ADMIN/EMPLEADO), y opcionalmente teléfono/notas, y confirma,
   **Then** el sistema llama `auth.api.createUser()` con `role`, seguido de un `prisma.user.update()` inmediato para `phone`/`notes`/`isActive: true` (H1 corregido — `data` de `createUser()` no persiste campos no registrados en el schema de Better Auth), el nuevo empleado aparece en el listado sin recargar la página (AC7), y el modal se cierra.

2. **Given** el correo ingresado ya está registrado,
   **When** el admin intenta crear el empleado,
   **Then** Better Auth rechaza la operación nativamente (ver H3) antes de cualquier escritura, y el formulario muestra "El correo electrónico ya está registrado" sin cerrar el modal ni limpiar los campos ya llenados.

3. **Given** el admin ingresa una contraseña de menos de 6 caracteres,
   **When** intenta enviar el formulario,
   **Then** la validación de Zod (`CreateEmployeeInputSchema`) bloquea el envío en el cliente **antes** de llamar a la API — ver H2, Better Auth no impone este mínimo por sí solo.

### Edición de empleado

4. **Given** el admin hace clic en "Editar" sobre un empleado existente en la tabla,
   **When** modifica nombre, correo, teléfono, notas, o rol, y confirma,
   **Then** los cambios se guardan vía `prisma.user.update()` directo (ver H5) y se reflejan en el listado sin recargar la página (AC8).

5. **Given** el admin cambia el correo de un empleado a uno ya usado por otro usuario,
   **When** confirma la edición,
   **Then** el sistema rechaza el cambio con "El correo electrónico ya está registrado" (chequeo Prisma manual, excluyendo el propio id) sin modificar el registro.

6. **Given** el modal de edición está abierto,
   **When** el admin lo usa,
   **Then** no existe ningún campo para `isActive` ni para contraseña — esos flujos son Story 3.4/3.5, no se anticipan aquí (ver Alcance).

### Actualización del listado

7. **Given** una creación exitosa,
   **When** el modal se cierra,
   **Then** `UsuariosManager` recarga el listado real desde `GET /api/usuarios` (reutiliza `fetchEmployees()` de Story 3.2, mismo mecanismo que el botón "Actualizar").

8. **Given** una edición exitosa,
   **When** el modal se cierra,
   **Then** `UsuariosManager` recarga el listado real de la misma forma que en AC7.

### Autorización

9. **Given** `POST /api/usuarios` y `PATCH /api/usuarios/[id]` reciben una request sin sesión válida o con sesión de rol `EMPLEADO`,
   **When** se invocan,
   **Then** responden `401`/`403` con el mismo patrón ya usado en `GET /api/usuarios` (Story 3.2) — la autorización real vive en la ruta, no en el chequeo interno (opcional) del plugin `admin` (ver H4).

### Integridad con Epic 1/2 y Stories 3.1/3.2

10. **Given** cualquier parte de esta historia ejecuta,
    **When** corre el código,
    **Then** no se modifica ningún archivo de `modules/migration/`, `app/api/migracion/`, y `GET /api/migracion/users` sigue respondiendo igual; `listEmployees`, `EmployeeFilters`, y el botón "Actualizar" de Story 3.2 siguen funcionando sin cambios de comportamiento.

## Tasks / Subtasks

- [x] Task 1: Extender `types/api/users.ts` — `CreateEmployeeInputSchema` (Zod: `name.min(1)`, `email.email()`, `password.min(6)`, `role: enum(["ADMIN","EMPLEADO"])`, `phone.optional()`, `notes.optional()`) y `UpdateEmployeeInputSchema` (mismos campos salvo `password`, todos opcionales) + tipos inferidos `CreateEmployeeInput`/`UpdateEmployeeInput` — AC: 1, 3, 4, 6
- [x] Task 2: Extender `modules/users/users.service.ts`:
  - [x] `createEmployee(input: CreateEmployeeInput): Promise<Employee>` — llama `auth.api.createUser({ body: { email, password, name, role } })` sin `headers` (ver H4); captura el error de correo duplicado de Better Auth y relanza `new Error("El correo electrónico ya está registrado")`; completa `phone`/`notes`/`isActive: true` con `prisma.user.update()` inmediato (H1 corregido — ver Dev Agent Record) usando el mismo `select` que `listEmployees` — AC: 1, 2
  - [x] `updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee>` — si `input.email` cambia, valida unicidad con `prisma.user.findFirst({ where: { email: input.email, NOT: { id } } })`, lanza `Error` si existe; luego `prisma.user.update({ where: { id }, data: {...}, select: <mismo select que listEmployees> })` — AC: 4, 5
  - [x] `parseCreateEmployeeInput`/`parseUpdateEmployeeInput` en el mismo archivo — mismo patrón que `parseCreateMemberInput` — AC: 1, 4
- [x] Task 3: Agregar `POST` a `app/api/usuarios/route.ts` — mismo patrón ADMIN-only ya usado en el `GET` de esa ruta (401/403, extraído a un helper local `requireAdminSession()` para no duplicarlo entre `GET`/`POST` del mismo archivo), parsea body con `parseCreateEmployeeInput`, llama `UsersService.createEmployee`, responde `201` — AC: 1, 2, 9
- [x] Task 4: Crear `app/api/usuarios/[id]/route.ts` — `PATCH`, mismo patrón ADMIN-only, valida `id` no vacío, parsea body con `parseUpdateEmployeeInput`, llama `UsersService.updateEmployee`, responde `200` — AC: 4, 5, 9
- [x] Task 5: Extender `lib/api/users.client.ts` — `createEmployee(payload)` (`POST /api/usuarios`) y `updateEmployee(id, payload)` (`PATCH /api/usuarios/${id}`), mismo patrón `ApiResponse<T>`/`handleResponse` ya existente — AC: 1, 4
- [x] Task 6: Crear `app/(dashboard)/usuarios/_components/CrearEmpleadoModal.tsx` — mismo patrón que `crear-socio-modal.tsx` (Dialog + `useForm`+`useWatch`+`zodResolver(CreateEmployeeInputSchema)` + campos name/email/password/role(Select)/phone/notes(Textarea) + estado loading/error + `onSuccess`/`onClose`) — AC: 1, 2, 3, 6
- [x] Task 7: Crear `app/(dashboard)/usuarios/_components/EditarEmpleadoModal.tsx` — mismo patrón que `editar-socio-modal.tsx` (recibe `employee: Employee | null`, `useEffect`+`reset()` para precargar valores, sin campo de contraseña ni `isActive`) — AC: 4, 5, 6
- [x] Task 8: Modificar `UsuariosManager.tsx` — agregado botón "Nuevo Empleado" (mismo patrón que "Nuevo Socio" en `socios-manager.tsx`), estado de modales (`modalCrear`, `employeeEditar`), `onSuccess` reutiliza `handleActualizar` (mismo mecanismo del botón "Actualizar" de Story 3.2) — AC: 1, 4, 7, 8
- [x] Task 9: Modificado `EmployeeTable.tsx` — `PendingActions` renombrado a `EmployeeActions`, con botón "Editar" habilitado (`onClick` real vía prop `onEditar`) + botones "Activar/Desactivar" y "Reiniciar contraseña" **sin cambios** (siguen `disabled`, tal como Story 3.2 los dejó) — AC: 4, ver Alcance
- [x] Task 10: Verificación manual contra la DB real de desarrollo — ver Debug Log References
- [x] Task 11: `npx tsc --noEmit` y `npm run lint` limpios (confirmado dos veces: antes y después de corregir H1). Suite completa de smoke tests sin regresión.

## Dev Notes

### Reutilización obligatoria (no reinventar)

- **Patrón de modal de creación**: copiar la forma de `app/(dashboard)/socios/_components/crear-socio-modal.tsx` — `useForm<Input>({ resolver: zodResolver(Schema) })`, bloque de error, `Loader2` en el botón de submit, `onSuccess()`+`reset()`+`onClose()` en éxito.
- **Patrón de modal de edición**: copiar la forma de `editar-socio-modal.tsx` — `useEffect` que hace `reset({...employee})` cuando cambia el empleado recibido, mismo flujo de error/loading.
- **Patrón de ruta ADMIN-only**: copiar literal el `GET` ya existente en `app/api/usuarios/route.ts` (Story 3.2) para el nuevo `POST`, y para el nuevo `app/api/usuarios/[id]/route.ts` — sesión→401, `prisma.user.findUnique({select:{role:true}})`→403 si no ADMIN.
- **Patrón `[id]/route.ts`**: copiar la forma de `app/api/members/[id]/route.ts` (`PATCH`) — el `id` de `User` es `String` (no `Number`), así que el chequeo `isNaN` de Members no aplica; solo validar que `id` no sea vacío.
- **`Textarea`** (`components/ui/textarea.tsx`) ya existe para el campo `notes` — no crear un `<textarea>` nativo.
- **No crear un modelo `Employee` nuevo ni tocar `modules/users/types.ts`** — el tipo `Employee` (Story 3.1) ya cubre todo lo que el listado y los formularios necesitan mostrar/editar.

### Por qué NO se usa `adminUpdateUser` para la edición

Ver H5. Aunque Better Auth ofrece `auth.api.adminUpdateUser`, usarlo crearía un segundo camino para el mismo caso de uso (editar `name`/`email`/`role`) en paralelo a `prisma.user.update()` — violaría P-8 y contradiría AD-U2 (mantener `role`/`isActive`/`phone`/`notes` como campos Prisma gestionados por SGF, no por el plugin). El AC de `epics.md` ya es explícito sobre esto ("los cambios se guardan vía Prisma directo").

### Por qué el alta SÍ necesita Better Auth (y no puede ser Prisma directo)

`User` no tiene columna de contraseña — vive en `Account.password`, gestionada exclusivamente por Better Auth (`emailAndPassword`). Crear un `User` con `prisma.user.create()` directo dejaría al empleado sin `Account` y sin poder iniciar sesión — exactamente el bug que tenía `services/users.service.ts::createUser()` (eliminado en Story 3.1). `auth.api.createUser()` crea `User` + `Account` (password hasheado) en una sola operación (ver H1, `admin/routes.mjs:165-178`).

### Límite explícito con Story 3.4 (Activación/Desactivación)

El campo `isActive` se fija **una sola vez**, en `true`, dentro de `data` al crear (H1) — nunca se vuelve a tocar en esta historia. El modal de edición (Task 7) **no incluye ningún control para `isActive`**. El botón "Activar/Desactivar" en `EmployeeTable` permanece `disabled` exactamente como lo dejó Story 3.2 — Task 9 solo toca el botón "Editar".

### Límite explícito con Story 3.5 (Contraseñas)

El campo de contraseña **solo existe en el modal de creación** (Task 6), nunca en el de edición (Task 7). No se implementa `setUserPassword()`, `changePassword()`, ni ningún flujo de "olvidé mi contraseña". El botón "Reiniciar contraseña" en `EmployeeTable` permanece `disabled`.

### Arquitectura (P-1 a P-8, `CLAUDE.md`)

- `modules/users/users.service.ts` es el único archivo que importa tanto `auth.api.*` (para `createEmployee`) como `prisma` directo (para `updateEmployee`) — mismo principio que Migración aplica en sus servicios (P-2).
- Las rutas API (`app/api/usuarios/route.ts`, `app/api/usuarios/[id]/route.ts`) no contienen lógica condicional de negocio más allá de sesión/rol — el `createUser()`/`prisma.user.update()` vive en el Service.
- `types/api/users.ts` sigue siendo la única fuente de verdad del contrato — `lib/api/users.client.ts` permanece fetch-only, sin lógica de negocio.

### Project Structure Notes

- Archivos a crear: `app/api/usuarios/[id]/route.ts`, `app/(dashboard)/usuarios/_components/CrearEmpleadoModal.tsx`, `app/(dashboard)/usuarios/_components/EditarEmpleadoModal.tsx`.
- Archivos a modificar: `types/api/users.ts`, `modules/users/users.service.ts`, `app/api/usuarios/route.ts` (agrega `POST`), `lib/api/users.client.ts`, `app/(dashboard)/usuarios/_components/UsuariosManager.tsx`, `app/(dashboard)/usuarios/_components/EmployeeTable.tsx`.
- Sin archivos nuevos en `modules/users/domain/` — no hay lógica de filtrado pura nueva que agregar (a diferencia de Story 3.2).

### Testing standards summary

- Mismo criterio que Stories 3.1/3.2: infraestructura + flujo de formulario, verificación real es manual y empírica contra la DB de desarrollo (usuarios de prueba `@sgf.local`, desechables, limpiados al final) — no hay lógica pura nueva que amerite un smoke test dedicado (`createEmployee`/`updateEmployee` son orquestación de Better Auth + Prisma, no funciones puras).
- Regresión obligatoria: `GET /api/usuarios` (búsqueda/filtros de Story 3.2) y `GET /api/migracion/users` deben seguir respondiendo exactamente igual.
- `npx tsc --noEmit` y `npm run lint` limpios.

### Riesgos

- **R1**: si un futuro cambio de `better-auth` empieza a filtrar `data` por `additionalFields` registrados (hoy no lo hace, ver H1), `phone`/`notes` dejarían de escribirse silenciosamente al actualizar la librería — no es un riesgo de esta historia, pero vale la pena que la verificación manual (Task 10) confirme explícitamente que ambos campos llegan a la fila creada, no solo que la request responda `201`.
- **R2**: el mensaje de error nativo de Better Auth para correo duplicado está en inglés (H3) — si `createEmployee` no lo intercepta y traduce, el admin vería un mensaje en inglés inconsistente con el resto de la UI en español.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.3-Alta-y-Edición-de-Empleados] — AC originales (líneas 632-654)
- [Source: _bmad-output/planning-artifacts/epics.md#Architectural-Decisions] — AD-U1 (líneas 538), AD-U2 (línea 540)
- [Source: _bmad-output/implementation-artifacts/investigations/administracion-usuarios-investigation.md#6.3-6.4] — decisión de usar `createUser()` en vez de `signUpEmail()`, y de mantener `email` editable
- [Source: _bmad-output/implementation-artifacts/3-1-habilitar-admin-plugin-infraestructura.md] — plugin `admin` habilitado, `roles`/`adminRoles`/`defaultRole` ya configurados, H6 (llamadas headerless)
- [Source: _bmad-output/implementation-artifacts/3-2-listado-busqueda-filtro-empleados.md] — `Employee`, `listEmployees`, `GET /api/usuarios`, patrón ADMIN-only ya probado
- [Source: node_modules/better-auth/dist/plugins/admin/routes.mjs:111-180] — `createUser` real: body schema, chequeo de duplicado, ausencia de chequeo de `minPasswordLength`, chequeo de permisos condicionado a sesión
- [Source: node_modules/better-auth/dist/plugins/admin/routes.mjs:181+] — `adminUpdateUser`, existente pero no usado (H5)
- [Source: node_modules/better-auth/dist/db/internal-adapter.mjs:52-58] — `createUser` interno, spread sin filtrar
- [Source: node_modules/better-auth/dist/adapters/prisma-adapter/prisma-adapter.mjs:130-135] — `create()` del adapter Prisma, sin whitelist de campos
- [Source: modules/members/members.service.ts, app/api/members/route.ts, app/api/members/[id]/route.ts] — patrón real de `parse*Input`/rutas POST+PATCH a replicar
- [Source: app/(dashboard)/socios/_components/crear-socio-modal.tsx, editar-socio-modal.tsx] — patrón real de formularios Zod + react-hook-form a replicar
- [Source: app/api/migracion/reconstruccion/backup-status/route.ts] — patrón ADMIN-only ya usado en Epic 1/2 y en Story 3.2

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5) — `/bmad-dev-story`

### Debug Log References

**Contradicción real encontrada y corregida (H1):** el rastreo original de la historia (3 capas: `admin/routes.mjs` → `db/internal-adapter.mjs` → `adapters/prisma-adapter/prisma-adapter.mjs`) concluyó que `data` en `createUser()` llegaba sin filtrar a Prisma. Al implementar y probar contra la DB real, un empleado creado con `data: { phone: "5551234567", notes: "..." }` quedó con `phone=null, notes=null` en la fila real. Se encontró la capa faltante: `@better-auth/core/dist/db/adapter/index.mjs:333-368` (`transformInput()`) — se ejecuta **antes** del adapter de Prisma y solo copia campos declarados en `schema[model].fields` (core de Better Auth + `additionalFields` registrados por plugins). `phone`/`notes` nunca se registraron ahí. `role` sí sobrevive porque el plugin `admin` lo declara en su propio schema. Corrección aplicada: `createEmployee()` ahora hace `auth.api.createUser({body:{email,password,name,role}})` seguido de un `prisma.user.update()` inmediato con `phone`/`notes`/`isActive: true`. Re-verificado con un segundo empleado de prueba: `phone`/`notes`/`isActive` persistieron correctamente.

Verificación funcional completa contra la base de datos real de desarrollo (Prisma Postgres, usuarios reales Nacho/Carlos/Andrew sin tocar; 2 usuarios de prueba `@sgf.local` creados y eliminados en esta misma sesión):

**Alta:**
1. `POST /api/usuarios` sin sesión → `401`; con sesión de Carlos (EMPLEADO) → `403` ✅
2. `POST /api/usuarios` con `password: "123"` (5 caracteres) → `400`, rechazado por `CreateEmployeeInputSchema` (Zod) antes de llamar a `createUser()` — mensaje "La contraseña debe tener al menos 6 caracteres" ✅
3. `POST /api/usuarios` con datos válidos (`role: EMPLEADO`, `phone`, `notes`) → `201`; primer intento (antes del fix de H1) confirmó el bug (`phone`/`notes` null); segundo intento (después del fix) confirmó `phone`/`notes`/`isActive: true` correctos ✅
4. Login real con la credencial recién creada (`POST /api/auth/sign-in/email`) → `200`, sesión válida — confirma que `createUser()` sí crea `Account` con password utilizable ✅
5. `POST /api/usuarios` con el mismo correo → `400 {"error":"El correo electrónico ya está registrado"}`; confirmado con `GET /api/usuarios?search=...` que sigue existiendo solo 1 registro con ese correo (sin registro parcial) ✅

**Edición (sobre el empleado de prueba creado en el paso 3):**
6. `PATCH /api/usuarios/{id}` sin sesión → `401`; con sesión EMPLEADO → `403` ✅
7. `PATCH` con `name`, `email` nuevo, `phone` nuevo, `notes` nuevo, `role: ADMIN` (cambio de EMPLEADO→ADMIN) → `200`, todos los campos persistidos correctamente, `isActive` siguió en `true` sin tocarse ✅
8. Login con el correo **nuevo** (post-edición) y la contraseña **original** (nunca tocada) → `200` — confirma H6 (editar email vía Prisma no rompe la credencial) y que la edición no afecta la contraseña ✅
9. `PATCH` cambiando el correo al de Carlos (ya en uso) → `400 {"error":"El correo electrónico ya está registrado"}`; confirmado que el registro de Carlos (`updatedAt`) no cambió — sin modificación del registro ajeno ✅

**Regresión:**
10. `GET /api/usuarios` (sin filtros) → sigue listando Andrew/Carlos/Nacho + empleados de prueba mientras existieron; `?role=ADMIN` reflejó correctamente al empleado de prueba tras el cambio de rol — Story 3.2 sin cambios de comportamiento ✅
11. `GET /api/migracion/users` → `200`, misma forma de respuesta (`id`,`name`,`email`) antes y después de todas las pruebas ✅
12. `git diff 5f29b54 --stat` no incluye ningún archivo de `modules/migration/`/`app/api/migracion/` — Migración sin cambios ✅

**Limpieza:** los 2 usuarios de prueba (`test-story33@sgf.local`, `test-story33-edit@sgf.local`) se verificaron sin `Shift`/`InventoryMovement`/`CashWithdrawal` asociados y se eliminaron con `prisma.user.delete()` (cascada automática sobre `Account`/`Session` por el `onDelete: Cascade` del schema) mediante un script temporal creado, ejecutado y borrado en esta misma sesión. Confirmado `GET /api/usuarios` final: solo Andrew/Carlos/Nacho, sin residuos de prueba.

**Nota de entorno** (no relacionada con el código de la historia, mismo procedimiento que Story 3.2): sandbox Linux, `app/generated/prisma/` traía los 3 engines; se removieron temporalmente `darwin-arm64`/`rhel` para forzar la selección del engine `debian` durante `next dev` local, y se restauraron al terminar (`app/generated/prisma` está en `.gitignore`, sin impacto en el repo).

### Completion Notes List

- **H1 corregido con evidencia real** (ver Debug Log References) — desviación del diseño original de la historia, documentada y resuelta con el cambio mínimo (`prisma.user.update()` inmediato después de `createUser()`), sin crear un segundo camino de escritura ni tocar `adminUpdateUser`.
- Ningún archivo de `modules/migration/`, `app/api/migracion/` fue modificado.
- `services/users.service.ts` (legacy) no fue restaurado ni reutilizado; `auth.api.adminUpdateUser` no se usó (H5).
- No se implementó ninguna acción fuera de alcance: sin activar/desactivar, sin revocación de sesiones, sin `setUserPassword()`/`changePassword()`/`banUser()`. En `EmployeeTable`, únicamente el botón "Editar" tiene `onClick` real — "Activar/Desactivar" y "Reiniciar contraseña" siguen `disabled` sin handler, exactamente como en Story 3.2.
- El modal de edición no incluye campo de `isActive` ni de contraseña (AC6).
- `npx tsc --noEmit` y `npm run lint`: limpios en los 9 archivos tocados/creados (verificado antes y después del fix de H1).
- Suite completa de smoke tests: sin regresión. Los 2 fallos de `npm run smoke` (`difference=0 esperado -50`, `difference=75 esperado 25`) son preexistentes — confirmado por evidencia de alcance (`git diff 5f29b54 --stat` no toca ningún archivo de Shift/Inventario/Sales), mismos fallos ya documentados desde Story 3.1.
- No se agregó ningún smoke test nuevo dedicado: `createEmployee`/`updateEmployee` son orquestación de Better Auth + Prisma (no funciones puras) — verificación real fue funcional contra la DB real (ver Debug Log References), mismo criterio que Stories 3.1/3.2.

### File List

**Creados:**
- `app/api/usuarios/[id]/route.ts`
- `app/(dashboard)/usuarios/_components/CrearEmpleadoModal.tsx`
- `app/(dashboard)/usuarios/_components/EditarEmpleadoModal.tsx`

**Modificados:**
- `types/api/users.ts` — agrega `CreateEmployeeInputSchema`, `UpdateEmployeeInputSchema` y tipos inferidos
- `modules/users/users.service.ts` — agrega `createEmployee`, `updateEmployee`, `parseCreateEmployeeInput`, `parseUpdateEmployeeInput`, constante `EMPLOYEE_SELECT` compartida; en Code Review se agrega rollback compensatorio en `createEmployee` (ver sección Code Review)
- `app/api/usuarios/route.ts` — agrega `POST`, extrae `requireAdminSession()` compartido con `GET`
- `lib/api/users.client.ts` — agrega `createEmployee`, `updateEmployee`
- `app/(dashboard)/usuarios/_components/UsuariosManager.tsx` — agrega botón "Nuevo Empleado", estado de modales, `handleEditar`
- `app/(dashboard)/usuarios/_components/EmployeeTable.tsx` — `PendingActions` → `EmployeeActions`, botón "Editar" habilitado

## Code Review (2026-07-03)

**Método:** review directo secuencial (sin subagentes, sin capas paralelas), contra el commit `3c83529`.

### Hallazgo Crítico — corregido

**[CRITICAL] Estado parcial real en `createEmployee()`: `auth.api.createUser()` y el `prisma.user.update()` posterior no son atómicos.**

`createEmployee()` ejecuta dos escrituras secuenciales sin transacción compartida (Better Auth y Prisma no pueden compartir una). Si el `update()` (que completa `phone`/`notes`/`isActive`) falla **después** de que `createUser()` ya creó `User`+`Account` con credencial válida, la función lanzaba el error del `update()` tal cual — el admin veía "creación fallida", pero un empleado real, con login funcional, ya existía en la base de datos, no rastreado por la UI. Más grave si el rol asignado era `ADMIN`.

**Reproducido de forma controlada** (sin apagar la DB a mitad de operación): un script forzó el `update()` a apuntar a un id inexistente (simula cualquier fallo real del segundo paso) inmediatamente después de un `createUser()` real. Resultado antes del fix:
- El `User` seguía existiendo en la DB tras el "fallo".
- `phone`/`notes` quedaron `null`, `isActive` quedó `true` (por el `@default(true)` de Prisma, no por la lógica de la app).
- Login real con la contraseña recién creada funcionó — la credencial era 100% utilizable pese al error reportado.

**Fix aplicado** (cambio mínimo, sin abstracción nueva, sin `signUpEmail()`, sin Prisma directo para credenciales, sin tocar la autoridad de Better Auth): se envolvió el `update()` en un segundo `try/catch`. Si falla, se ejecuta un `prisma.user.delete({ where: { id: userId } })` de mejor esfuerzo (revierte `User`+`Account`+`Session` vía la cascada ya definida en el schema) y se relanza un error honesto ("no se pudo completar el alta... se revirtió"). Esto hace el alta todo-o-nada desde la perspectiva del admin — la única alternativa real (transacción compartida) es imposible porque Better Auth y Prisma no exponen una transacción común; una compensación explícita es la solución arquitectónicamente coherente para este caso, tal como anticipó la Story.

**Re-verificado con el mismo mecanismo de reproducción tras el fix:**
- `createEmployee()` lanza el error esperado.
- El `User` **no** queda huérfano (`findUnique` → `null`).
- El login con esa credencial falla (`Invalid email or password`) — confirmando que no queda una cuenta fantasma utilizable.
- El camino normal (sin fallo forzado) se probó de nuevo tras el fix — sin regresión, `phone`/`notes`/`isActive` siguen persistiendo correctamente.

### Otros puntos auditados — sin hallazgos

- **H1 (refutado):** confirmado como estaba documentado — `@better-auth/core/dist/db/adapter/index.mjs:333-368` (`transformInput`) filtra `data` por `schema[model].fields`; `phone`/`notes` nunces se registraron ahí, `role` sí (plugin `admin`). No es un incumplimiento de la historia, es la corrección correcta de un hallazgo previo basado en lectura de código que la ejecución real refutó.
- **Contraseña:** `password.min(6)` en Zod bloquea el alta antes de tocar `createUser()` (confirmado con `curl` directo a la API, 400 con mensaje claro). `UpdateEmployeeInputSchema` no tiene campo `password` — imposible de smugglear (Zod descarta claves no declaradas). Verificado con un intento real de `PATCH` incluyendo `password`/`isActive`/`banned`: los tres fueron ignorados, `isActive` siguió `true`, login con la contraseña original siguió funcionando.
- **Correo duplicado:** alta rechazada nativamente por Better Auth antes de escribir (confirmado, sin registro parcial); edición usa un chequeo Prisma propio (`findFirst` excluyendo el propio id) con mensaje propio — no depende de parsear mensajes internos frágiles de Prisma/Better Auth.
- **Autorización:** ambos endpoints (`POST /api/usuarios`, `PATCH /api/usuarios/[id]`) son ADMIN-only server-side, verificado con sesión real de `EMPLEADO` (403) y sin sesión (401) contra ambos. La seguridad no depende de la UI ni de que `createUser()` sea headerless.
- **Campos permitidos:** confirmado por lectura de `UpdateEmployeeInputSchema` + `updateEmployee()` y por intento real de smuggling — edición no puede tocar `isActive`, `password`, `banned`, `banReason`, `banExpires`, ni ningún campo interno de Better Auth.
- **Capas/contratos:** `types/api/users.ts` sigue siendo la única fuente del contrato; `lib/api/users.client.ts` es fetch-only; toda la coordinación Better Auth+Prisma vive en `modules/users/users.service.ts`; `services/users.service.ts` (legacy) no fue restaurado; `adminUpdateUser` no se usa.
- **UI:** errores Zod visibles por campo; errores de API mostrados en el bloque rojo del modal (nunca se llama `onSuccess()` si `result.ok` es `false`); modal de alta resetea y cierra solo en éxito real; modal de edición precarga los datos reales del empleado vía `useEffect`+`reset()`; ambos modales refrescan el listado real (`handleActualizar`, refetch de servidor, no mutación local simulada); solo "Editar" tiene `onClick`, "Activar/Desactivar" y "Reiniciar contraseña" siguen `disabled` sin handler.
- **Regresión:** Story 3.2 (`GET /api/usuarios`, filtros) sin cambios de comportamiento; `/usuarios` sigue protegido; `GET /api/migracion/users` sin cambios; `modules/migration/`/`app/api/migracion/` sin tocar (confirmado con `git diff 5f29b54 --stat`).

### Pruebas ejecutadas

- `npx tsc --noEmit`: limpio (antes y después del fix).
- `npm run lint` sobre los 10 archivos tocados: limpio.
- Suite completa de smoke tests: sin regresión — los 2 fallos de `npm run smoke` son preexistentes, confirmado por evidencia de alcance (sin overlap con Shift/Inventario/Sales en el diff).
- Verificación funcional completa contra la DB real de desarrollo (usuarios reales Nacho/Carlos/Andrew sin tocar; usuarios de prueba `@sgf.local` creados y eliminados en esta sesión): reproducción controlada del escenario de fallo (antes y después del fix), alta/edición reales vía API, intento de smuggling de campos protegidos, autorización 401/403, regresión de Story 3.2 y Migración.

**Resultado: ✅ Aprobado — 1 hallazgo Critical corregido, sin hallazgos pendientes.**
