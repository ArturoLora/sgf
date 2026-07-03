# Story 3.1: Habilitar Better Auth Admin Plugin e Infraestructura del Módulo

Status: review

## Story

As an administrador de SGF,
I want que el sistema tenga habilitada la infraestructura de autenticación administrativa y los campos de empleado necesarios,
So that las historias siguientes de Administración de Usuarios (3.2–3.5) puedan construirse sin volver a tocar configuración base.

## Alcance

**Incluido:** habilitar el plugin `admin` de Better Auth, ampliar `User` con `phone`/`notes`, subir `minPasswordLength` a 6, extender `requireAuth()` para validar `isActive`, crear `modules/users/` (servicio + tipos base, sin lógica de negocio de UI todavía), y eliminar `services/users.service.ts` (código muerto, sin consumidores, con `createUser()` roto — ver investigación).

**No incluido (historias 3.2–3.5):** listado de empleados, formularios, alta, edición, activación/desactivación, cambio de contraseñas, cualquier UI administrativa. Esta historia no expone ninguna pantalla nueva.

**No se modifica:** ningún archivo de `modules/migration/`, ninguna historia de Epic 1/2. `GET /api/migracion/users` (Story 1.3) debe seguir funcionando exactamente igual.

## Hallazgos de análisis (documentados, no resueltos aquí)

Verificados contra el paquete `better-auth@1.4.12` real instalado en `node_modules/`, no contra documentación genérica ni versiones distintas.

| # | Hallazgo | Evidencia | Restricción que impone sobre esta historia |
|---|----------|-----------|---------------------------------------------|
| H1 | El plugin `admin` declara en su propio schema (`node_modules/better-auth/dist/plugins/admin/schema.mjs`) los campos `User.banned`, `User.banReason`, `User.banExpires`, y `Session.impersonatedBy` — **ninguno existe hoy en `prisma/schema.prisma`**. No está verificado si Better Auth los referencia de forma incondicional (ej. en cada `getSession()`) o solo cuando se invocan métodos específicos de baneo/impersonación (que este módulo no planea usar, ver AD-U2). | `node_modules/better-auth/dist/plugins/admin/schema.mjs` | Antes de dar por "habilitado" el plugin, debe verificarse empíricamente (login real, `getSession()` real, `createUser()` real) que la ausencia de esas columnas no rompe nada. Si se requieren para que el plugin funcione sin errores, agregarlas es una migración aditiva sin conflicto — SGF nunca llamará `banUser()`/`impersonateUser()`. |
| H2 | El mismo schema declara `User.role` como `type: "string"` genérico. El `role` real de SGF es un **enum nativo de Postgres** (`Role { ADMIN, EMPLEADO }`). Si el plugin intenta escribir un valor de rol por defecto (ej. `"user"`) que no coincide con los valores válidos del enum, la escritura fallaría a nivel de base de datos. | `node_modules/better-auth/dist/plugins/admin/schema.mjs`; `prisma/schema.prisma` — `enum Role { ADMIN, EMPLEADO }` | El plugin admite opciones `defaultRole`/`adminRoles` (confirmado en `admin.d.mts`) — deben configurarse explícitamente para alinear con `"ADMIN"`/`"EMPLEADO"`, aunque esta historia y el módulo en general **no usan `auth.api.setRole()`** (ver H3/AD-U2). Esto evita que el propio plugin escriba un valor inválido en su lógica interna de asignación de rol por defecto. |
| H3 | El AC de la Epic 3 para esta historia (tal como quedó redactado en `epics.md`) pide verificar que `auth.api.setRole` esté disponible "sin errores" — esto **contradice AD-U2**, que decidió mantener `role` gestionado por Prisma directo, no por el plugin. | `_bmad-output/planning-artifacts/epics.md` — Story 3.1 (AC original) vs. sección "Architectural Decisions — AD-U2" del mismo documento | Esta historia **corrige** ese AC: se verifica disponibilidad de `createUser`, `setUserPassword`, y `revokeUserSessions` únicamente. `setRole` no se usa ni se verifica — el cambio de rol seguirá siendo `prisma.user.update({ data: { role } })`, igual que ya hace `prisma/seed.ts` de forma probada. |
| H4 | `services/users.service.ts` no tiene ningún consumidor real (verificado con búsqueda en toda la carpeta `app/` durante la investigación) — solo se re-exporta en `services/index.ts` sin que nada lo importe de ahí. | Investigación previa (`administracion-usuarios-investigation.md`, sección 1.4) | Se elimina el archivo completo y su línea de re-export en `services/index.ts` — no hay ningún consumidor que migrar ni romper. |
| H5 | Extender `requireAuth()` para validar `isActive` agrega una consulta Prisma (`findUnique`) a **cada** carga de página del dashboard — hoy esa consulta solo ocurre en páginas que llaman `requireAdmin()`. | `lib/require-role.ts` actual — `requireAuth()` solo llama `auth.api.getSession()`, sin tocar Prisma | Aceptado como comportamiento correcto y necesario para FR-U8 (un empleado desactivado no debe conservar acceso) — se documenta como cambio de comportamiento global, no un efecto secundario oculto. |

## Acceptance Criteria

### Plugin y configuración de Better Auth

1. **Given** el plugin `admin` de Better Auth se agrega a `lib/auth.ts` con `defaultRole`/`adminRoles` configurados para coincidir con `"EMPLEADO"`/`"ADMIN"` (ver H2),
   **When** el servidor arranca y se ejecuta un login real,
   **Then** `auth.api.getSession()` sigue funcionando sin errores para los usuarios ya existentes (Nacho, Carlos, Andrew).

2. **Given** el plugin está habilitado,
   **When** se invocan `auth.api.createUser()`, `auth.api.setUserPassword()`, y `auth.api.revokeUserSessions()` con datos válidos (verificación manual, sin UI todavía),
   **Then** cada uno responde sin error — ver H3 sobre por qué `setRole` queda explícitamente fuera de esta verificación.

3. **Given** H1 identificó campos del schema del plugin que no existen en `prisma/schema.prisma`,
   **When** se completan las verificaciones de los AC 1 y 2,
   **Then** se documenta en el Dev Agent Record si esos campos fueron necesarios o no — si lo fueron, se agregan a `prisma/schema.prisma` como columnas opcionales (migración aditiva); si no, se deja constancia de que no fueron necesarios sin agregar columnas especulativas.

### Modelo de datos

4. **Given** el modelo `User` se amplía,
   **When** se ejecuta la migración de Prisma,
   **Then** `User` gana `phone String?` y `notes String?`, ambos opcionales, sin valor por defecto — ningún registro existente (Nacho, Carlos, Andrew, ni los 652 socios/1 corte reconstruidos en Epic 2) se ve alterado.

5. **Given** `minPasswordLength` se sube de 3 a 6 en `lib/auth.ts`,
   **When** un usuario ya existente con contraseña de 3 caracteres ("123") intenta iniciar sesión,
   **Then** el login funciona con la contraseña actual sin cambios — la política solo se aplica al **establecer** una contraseña (creación, cambio propio, reinicio por admin), nunca retroactivamente.

### Autorización

6. **Given** `requireAuth()` (`lib/require-role.ts`) se extiende para validar `isActive`,
   **When** un usuario con sesión válida pero `isActive = false` accede a cualquier página del dashboard,
   **Then** es redirigido a `/login`, igual que si no tuviera sesión (ver H5 sobre el costo de esta verificación).

7. **Given** un usuario con `isActive = true` (todos los existentes hoy),
   **When** navega el dashboard,
   **Then** el comportamiento es idéntico al actual — cero regresión para el caso normal.

### Estructura del módulo y limpieza de código muerto

8. **Given** `modules/users/` se crea siguiendo el mismo patrón estructural que `modules/migration/` (P-6),
   **When** se completa esta historia,
   **Then** existen `modules/users/users.service.ts` (funciones base, sin UI ni rutas de negocio todavía) y `modules/users/types.ts` — sin lógica de creación/edición/activación implementada aún (eso es 3.2–3.5).

9. **Given** `services/users.service.ts` no tiene consumidores (H4),
   **When** se completa esta historia,
   **Then** el archivo se elimina por completo, junto con su línea de re-export en `services/index.ts` — sin dejar una segunda implementación paralela del mismo caso de uso (P-8).

### Integridad con Epic 1/2 (Migración)

10. **Given** `GET /api/migracion/users` (Story 1.3) depende de `User.role`/`User.isActive` vía Prisma directo,
    **When** se completan todos los cambios de esta historia,
    **Then** ese endpoint responde exactamente igual que antes — se verifica manualmente contra el flujo de mapeo de empleados de Migración, sin ningún cambio a ese archivo.

11. **Given** cualquier parte de esta historia ejecuta,
    **When** corre el código,
    **Then** no se modifica ningún archivo de `modules/migration/`, `app/api/migracion/`, ni las historias ya aprobadas de Epic 1/2.

## Tasks / Subtasks (nivel arquitecto — el diseño detallado se define en dev-story)

- [x] Task 1: Verificar empíricamente H1/H2 contra el paquete `better-auth@1.4.12` real (login, `getSession()`, `createUser()`, `setUserPassword()`, `revokeUserSessions()`) **antes** de decidir si se agregan columnas nuevas al schema — AC: 1, 2, 3
- [x] Task 2: Habilitar el plugin `admin` en `lib/auth.ts` con `defaultRole`/`adminRoles` alineados a `"EMPLEADO"`/`"ADMIN"` — AC: 1, 2
- [x] Task 3: Migración de Prisma — `User.phone`, `User.notes`, y los campos del plugin confirmados necesarios por Task 1 (`User.banned`/`banReason`/`banExpires`, `Session.impersonatedBy`) — AC: 3, 4
- [x] Task 4: Subir `minPasswordLength` a 6 en `lib/auth.ts` — AC: 5
- [x] Task 5: Extender `requireAuth()` en `lib/require-role.ts` para validar `isActive` — AC: 6, 7
- [x] Task 6: Crear `modules/users/types.ts` (contrato base) — ver Completion Notes sobre por qué `users.service.ts` se difiere a Story 3.2 — AC: 8
- [x] Task 7: Eliminar `services/users.service.ts` y su re-export en `services/index.ts` — AC: 9
- [x] Task 8: Verificación manual de que `GET /api/migracion/users` y el flujo de mapeo de empleados de Migración no se rompen — AC: 10, 11

## Dev Notes

### Consistencia con Epic 1/2

- Mismo patrón P-2/P-6 que `modules/migration/`: un servicio por caso de uso, estructura de carpetas simétrica.
- `lib/require-role.ts` es el único archivo compartido fuera de `modules/users/` que esta historia toca — cambio pequeño y aditivo (una verificación más), no un rediseño del mecanismo de sesión.

### Project Structure Notes

- Archivos a crear: `modules/users/users.service.ts`, `modules/users/types.ts`.
- Archivos a modificar: `lib/auth.ts`, `lib/require-role.ts`, `prisma/schema.prisma`, `services/index.ts`.
- Archivo a eliminar: `services/users.service.ts`.
- Sin conflictos con la estructura unificada del proyecto.

### Testing standards summary

- Esta historia es principalmente de infraestructura — la verificación real es manual y empírica (login, sesión, llamadas a `auth.api.*`), no smoke tests de funciones puras (no hay lógica de negocio pura todavía que probar).
- **No dar por resuelto H1/H2 sin probarlo contra el entorno real** — el patrón de este proyecto ya demostró repetidamente (Story 1.2, 1.5, 2.1) que asumir el comportamiento de una librería sin verificarlo produce bugs reales.
- Regresión obligatoria: los 3 usuarios existentes (Nacho, Carlos, Andrew) deben poder seguir iniciando sesión con sus contraseñas actuales después de todos los cambios. `GET /api/migracion/users` debe seguir respondiendo igual.
- `npx tsc --noEmit` y `npm run lint` limpios.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#epic-3-administración-de-usuarios-y-empleados]
- [Source: _bmad-output/implementation-artifacts/investigations/administracion-usuarios-investigation.md — AD-U1, AD-U2, AD-U3]
- [Source: node_modules/better-auth/dist/plugins/admin/schema.mjs, admin.d.mts — verificado contra el paquete real instalado]
- [Source: lib/auth.ts, lib/require-role.ts, services/users.service.ts, prisma/schema.prisma — estado actual]
- [Source: prisma/seed.ts — patrón probado de `auth.api.signUpEmail()` + `prisma.user.update()` para rol]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5) — `/bmad-dev-story`

### Debug Log References

Verificación empírica ejecutada con un script temporal (`scripts/_tmp-verify-admin-plugin.ts`, creado, ejecutado y eliminado en esta misma sesión — no forma parte del File List porque no se commitea) contra la base de datos real del proyecto (Prisma Postgres), usando usuarios de prueba desechables (`@sgf.local`, limpiados al final de cada corrida).

**Hallazgo nuevo H1-confirmado (antes de la migración):** habilitar el plugin `admin` sin agregar `User.banned` rompe inmediatamente `signUpEmail()` — Better Auth intenta escribir `banned: false` en cada `create()` de usuario porque el schema del plugin declara `defaultValue: false` para ese campo, y Prisma rechaza con `PrismaClientValidationError: Unknown argument banned`. No es un error condicional a llamar `banUser()` — ocurre en la ruta de creación de usuario más básica. Confirma que agregar `banned`/`banReason`/`banExpires` a `User` y `impersonatedBy` a `Session` es obligatorio, no opcional, para poder habilitar el plugin en absoluto.

**Hallazgo nuevo H6 (no anticipado en el análisis original, descubierto durante la verificación):** `auth.api.setUserPassword()` y `auth.api.revokeUserSessions()` usan el middleware interno `adminMiddleware` del plugin, que exige una sesión resoluble desde `headers` (`getSessionFromCtx`) — a diferencia de `auth.api.createUser()`, que permite una llamada 100% server-side sin sesión (solo valida permisos si detecta `ctx.request`/`ctx.headers`). Además, el chequeo de permisos interno (`hasPermission()`) usa el mapa `options.roles`, **no** `adminRoles` — por defecto ese mapa solo reconoce las claves literales `"admin"`/`"user"` en minúsculas, así que con el enum real (`"ADMIN"`/`"EMPLEADO"`) cualquier llamada a `setUserPassword`/`revokeUserSessions` fallaba con `FORBIDDEN` aunque el usuario fuera `role: "ADMIN"`. Se resolvió configurando explícitamente `roles: { ADMIN: adminAc, EMPLEADO: userAc }` en `lib/auth.ts` (usando `adminAc`/`userAc` exportados por `better-auth/plugins/admin/access`) — verificado empíricamente: las 3 llamadas (`createUser` headerless, `setUserPassword` con headers de sesión ADMIN real, `revokeUserSessions` con headers de sesión ADMIN real) pasan sin error tras este cambio.

Secuencia de verificación ejecutada y resultado (todas OK tras el fix de `roles`):
1. `signUpEmail()` → OK (falló antes de la migración, confirmando H1; OK después).
2. `signInEmail()` → cookie de sesión real obtenida.
3. `getSession()` con esa cookie → OK (confirma que el hook `session.create.before` del plugin, que lee `user.banned` en cada login, no rompe nada con la columna ya presente).
4. `auth.api.createUser()` sin headers, rol `EMPLEADO` explícito → OK, sin invocar `setRole` (H3).
5. `prisma.user.update({ role, isActive })` directo sobre el usuario creado → OK (confirma que el flujo de rol vía Prisma, no vía plugin, sigue funcionando).
6. `auth.api.setUserPassword()` con headers de una sesión real con `role: "ADMIN"` → OK tras configurar `roles`.
7. `auth.api.revokeUserSessions()` con los mismos headers → OK.
8. Limpieza de usuarios de prueba → OK, 0 registros `@sgf.local` remanentes al finalizar.

Verificación adicional de regresión: login real de `nacho@nachogym.com` con su contraseña existente de 3 caracteres (`"123"`) tras subir `minPasswordLength` a 6 → `signInEmail` responde `200` y emite cookie de sesión — confirma que el límite de longitud solo aplica al *establecer* una contraseña, no al validarla en login (AC5, sin regresión sobre cuentas reales).

### Completion Notes List

- Se corrigió la inconsistencia de `epics.md` (Story 3.1 AC) que pedía verificar `auth.api.setRole` — se reemplazó por una nota explícita de que queda fuera de alcance (AD-U2/H3), evitando que una futura lectura de la épica reintroduzca esa expectativa.
- **Desviación documentada de AC8/Task 6:** la historia proponía crear `modules/users/users.service.ts` junto con `types.ts`. Se decidió **no** crear `users.service.ts` en esta historia — no existe todavía ningún caso de uso real que implementar (alta/edición/activación/contraseñas son Story 3.2–3.5), y crear el archivo con funciones vacías o sin consumidor habría violado la convención del proyecto de no dejar implementaciones a medias ni código muerto. Se entregó únicamente `modules/users/types.ts`, que sí es un contrato legítimo y necesario de inmediato (P-4) sin requerir lógica de negocio. `users.service.ts` se crea en Story 3.2 junto con su primer caso de uso real (`createEmployee`).
- `defaultRole`/`adminRoles`/`roles` se configuraron en `lib/auth.ts` para alinear el plugin con el enum real de Prisma — `roles` fue un requisito adicional descubierto empíricamente (H6, no estaba en el análisis original de la historia) sin el cual `setUserPassword`/`revokeUserSessions` habrían quedado inutilizables para Story 3.4/3.5.
- `app/(dashboard)/layout.tsx` requirió un ajuste mínimo (mapear explícitamente los 3 campos que `DashboardLayoutClient` espera) porque el plugin `admin` amplía globalmente el tipo `session.user` con `role?: string | null`, lo cual ya no encajaba con el tipo `role?: string` esperado por ese componente. Cambio de tipos únicamente, sin cambio de comportamiento.
- Confirmado sin regresión: los 3 usuarios reales (Nacho, Carlos, Andrew) conservan `isActive: true`, `phone: null`, `notes: null`, `banned: false` tras la migración — ninguno pierde acceso.
- `GET /api/migracion/users` no fue modificado; su dependencia (`auth.api.getSession()` + `prisma.user.findMany` con `select` explícito de 3 campos) queda verificada indirectamente por el paso 3 de la secuencia de verificación (getSession no se rompe) y por no seleccionar ninguna columna nueva.
- Suite de 179 smoke tests: 177 passed, 2 failed (`difference=0 esperado -50`, `difference=75 esperado 25` en `npm run smoke`) — **falla pre-existente, no relacionada con esta historia**: confirmado ejecutando la misma suite con los cambios de esta historia revertidos vía `git stash` (mismo resultado exacto, 2/25 fallando en el mismo caso). La lógica de cálculo de `Shift.difference` (Epic 1/2) no fue tocada por esta historia.
- `npx tsc --noEmit`: limpio. `npm run lint`: limpio en todos los archivos tocados por esta historia (los ~590 errores/warnings restantes son preexistentes en `app/generated/prisma/*` y otros archivos no tocados — no introducidos por esta historia).
- `git status` queda limpio salvo los archivos listados en File List (más un archivo `docs/corte ma[n]ana.xlsx` renombrado, preexistente y ajeno a esta historia, no tocado).

### File List

**Modificados:**
- `lib/auth.ts` — plugin `admin` habilitado (`defaultRole`, `adminRoles`, `roles`), `minPasswordLength` 3→6
- `lib/require-role.ts` — `requireAuth()` valida `isActive`
- `prisma/schema.prisma` — `User.phone`, `User.notes`, `User.banned`, `User.banReason`, `User.banExpires`, `Session.impersonatedBy`
- `services/index.ts` — removida la re-exportación de `UsersService`
- `app/(dashboard)/layout.tsx` — ajuste de tipos al pasar `session.user` a `DashboardLayoutClient`
- `_bmad-output/planning-artifacts/epics.md` — corrección de AC de Story 3.1 (elimina mención a `setRole`)

**Creados:**
- `modules/users/types.ts`
- `prisma/migrations/20260703015407_add_admin_plugin_fields_and_employee_fields/migration.sql`

**Eliminados:**
- `services/users.service.ts`
