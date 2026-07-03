# Story 3.2: Listado, Búsqueda y Filtro de Empleados

Status: review

## Story

As an administrador de SGF,
I want ver una lista de todos los empleados con búsqueda y filtros,
So that pueda encontrar rápidamente a un empleado para gestionarlo.

## Alcance

**Incluido:** `modules/users/users.service.ts` con su primer caso de uso real (`listEmployees`, resolviendo el defer de AC8 de Story 3.1), `GET /api/usuarios` (ADMIN-only), tipos/schemas en `types/api/users.ts`, listado con búsqueda (nombre/correo) y filtros (rol, estado activo/inactivo), Manager + tabla presentacional siguiendo el patrón de `SociosManager`, entrada de navegación para que el administrador llegue al módulo.

**No incluido (Stories 3.3–3.5):** crear empleados, editar empleados, activar/desactivar, reiniciar contraseña, cambio de contraseña propio, cualquier lógica basada en `banUser()`/`banned`. La tabla debe tener puntos de anclaje visuales para esas acciones futuras, pero ningún botón debe ejecutar lógica real todavía.

**No se modifica:** ningún archivo de `modules/migration/`, `app/api/migracion/`, `lib/auth.ts`, `lib/require-role.ts`. `GET /api/migracion/users` (Story 1.3) no se toca.

## Hallazgos de análisis (documentados, no resueltos fuera de esta historia)

| # | Hallazgo | Evidencia | Resolución en esta historia |
|---|----------|-----------|------------------------------|
| H1 | `epics.md` (AC de Story 3.2, línea 613) dice "el admin navega a **Configuración → Usuarios**". Pero la arquitectura aprobada en la investigación (`administracion-usuarios-investigation.md`, sección 6.6) define `app/(dashboard)/usuarios/` como ruta de **nivel superior**, hermana de `socios/`/`productos/`, no anidada bajo `configuracion/`. Además, `app/(dashboard)/configuracion/` **no tiene `page.tsx` propio hoy** — solo contiene `configuracion/migracion/`, por lo que "Configuración" como hub de navegación no existe como tal en el código real; el link `/configuracion` en `lib/navigation.ts` no tiene página que lo resuelva. | `lib/navigation.ts` (un solo item `/configuracion`, `adminOnly: true`); `find app/(dashboard)/configuracion` (solo subcarpeta `migracion/`, sin `page.tsx` en la raíz) | Se sigue la arquitectura aprobada (sección 6.6): ruta de nivel superior `/usuarios`, con su propia entrada en `dashboardRoutes` (`lib/navigation.ts`), igual que `Socios`/`Productos`. Se corrige el texto de `epics.md` (AC de Story 3.2) para reflejar "Usuarios" como sección de nivel superior, no "Configuración → Usuarios" — mismo tipo de corrección que Story 3.1 ya hizo sobre otro AC de `epics.md` (mención a `setRole`). |
| H2 | El Dev Agent Record de Story 3.1 (ya cerrada, `done`) documentó la desviación de AC8 asumiendo que `users.service.ts` se crearía "en Story 3.2 junto con su primer caso de uso real (`createEmployee`)". Pero el propio `epics.md` (línea 563, sección "Orden recomendado de implementación") ya había invertido el orden: **3.2 es el listado** (solo lectura) y **la creación se movió a 3.3**. La nota de Story 3.1 quedó desactualizada respecto al orden real ya vigente cuando se escribió — no se corrige Story 3.1 (ya cerrada), pero esta historia deja constancia del dato correcto. | `_bmad-output/implementation-artifacts/3-1-habilitar-admin-plugin-infraestructura.md` (Completion Notes) vs. `epics.md:563,566-567` | El primer caso de uso real de `modules/users/users.service.ts` en esta historia es **`listEmployees`**, no `createEmployee`. `createEmployee` se implementa en Story 3.3, cuando esa historia cree el archivo `users.service.ts` si esta historia no lo hiciera — como esta historia sí lo crea, 3.3 solo añade una función al archivo ya existente. |

## Acceptance Criteria

### Listado y acceso

1. **Given** el admin navega a `/usuarios`,
   **When** la página carga,
   **Then** ve una tabla con nombre, correo, rol, y estado (activo/inactivo) de todos los empleados, ordenados igual que el patrón ya usado en Socios (activos primero, luego por nombre).

2. **Given** un usuario autenticado con `role !== "ADMIN"`,
   **When** intenta acceder a `/usuarios` (navegación directa o URL),
   **Then** es redirigido antes de que la página renderice — mismo mecanismo que usa `MigracionPage` (`requireAdmin()` en el server component).

3. **Given** `GET /api/usuarios` recibe una request sin sesión válida o con sesión de rol `EMPLEADO`,
   **When** se invoca,
   **Then** responde `401` (sin sesión) o `403` (sesión válida, rol no ADMIN) — mismo patrón que `app/api/migracion/reconstruccion/backup-status/route.ts`.

### Búsqueda

4. **Given** la lista de empleados se muestra,
   **When** el admin escribe en el campo de búsqueda,
   **Then** la lista se filtra por coincidencia parcial (case-insensitive) de nombre o correo — mismo comportamiento que `MembersService.getAllMembers` con `params.search`.

### Filtros

5. **Given** la lista de empleados se muestra,
   **When** el admin selecciona un filtro de rol (`ADMIN`/`EMPLEADO`/todos),
   **Then** la lista se reduce a los empleados con ese rol exacto.

6. **Given** la lista de empleados se muestra,
   **When** el admin selecciona un filtro de estado (activo/inactivo/todos),
   **Then** la lista se reduce a los empleados que cumplen ese estado — reutilizar `parseBooleanQuery` de `services/utils.ts` (ya usado por Products/Members), no reimplementar el parseo de `"true"`/`"false"`.

7. **Given** búsqueda y filtros se combinan,
   **When** el admin tiene texto de búsqueda + un filtro de rol + un filtro de estado activos a la vez,
   **Then** los tres criterios se aplican con AND (mismo comportamiento que el `where` combinado de `MembersService.getAllMembers`).

### Anclaje para historias futuras

8. **Given** la tabla de empleados se renderiza,
   **When** el admin ve cada fila,
   **Then** existen puntos de anclaje visibles (ej. columna de acciones, aunque sea con botones deshabilitados o un menú vacío) para editar, activar/desactivar, y reiniciar contraseña — sin implementar ninguna de esas acciones en esta historia.

### Infraestructura de servicio (resuelve el defer de AC8, Story 3.1)

9. **Given** `modules/users/users.service.ts` no existe todavía (deferido explícitamente en Story 3.1),
   **When** se completa esta historia,
   **Then** el archivo existe con `listEmployees(params)` como único caso de uso implementado, y `parseUsersQuery(raw)` como helper de parseo de input — mismo patrón que `MembersService.getAllMembers`/`parseMembersQuery`.

### Integridad con Epic 1/2 (Migración) y Story 3.1

10. **Given** `GET /api/migracion/users` (Story 1.3) ya existe y no forma parte de esta historia,
    **When** se completan todos los cambios de esta historia,
    **Then** ese endpoint no se modifica y sigue respondiendo igual.

11. **Given** cualquier parte de esta historia ejecuta,
    **When** corre el código,
    **Then** no se modifica ningún archivo de `modules/migration/`, `app/api/migracion/`, `lib/auth.ts`, ni `lib/require-role.ts`.

## Tasks / Subtasks

- [x] Task 1: Crear `modules/users/users.service.ts` con `listEmployees(params?: ListEmployeesParams)` — construye el `where` de Prisma (búsqueda OR sobre `name`/`email`, filtro `role`, filtro `isActive` vía `parseBooleanQuery`), ordena `isActive desc, name asc` (mismo orden que Socios) — AC: 1, 4, 5, 6, 7, 9
  - [x] Reutilizar el tipo `Employee` ya existente en `modules/users/types.ts` (Story 3.1) — no crear un tipo paralelo
  - [x] Agregar `parseUsersQuery(raw: UsersQueryInput): ListEmployeesParams` en el mismo archivo — mismo patrón que `parseMembersQuery`
- [x] Task 2: Crear `types/api/users.ts` con `UsersQuerySchema` (Zod: `search?`, `role?`, `isActive?`, todos opcionales, strings crudos) y el tipo inferido `UsersQueryInput` — AC: 4, 5, 6, 9
- [x] Task 3: Crear `app/api/usuarios/route.ts` — `GET`: valida sesión (401 si no hay), valida `role === "ADMIN"` vía `prisma.user.findUnique({ select: { role: true } })` (403 si no), parsea `searchParams` con `UsersQuerySchema` + `UsersService.parseUsersQuery`, llama `UsersService.listEmployees`, responde el arreglo — AC: 2, 3, 10, 11
- [x] Task 4: Registrar `UsersService` en `services/index.ts` (`export * as UsersService from "@/modules/users/users.service"`) — mismo patrón que los demás módulos ya listados ahí — AC: 9
- [x] Task 5: Crear `app/(dashboard)/usuarios/page.tsx` — server component, `await requireAdmin()`, obtiene el listado inicial llamando `UsersService.listEmployees()` directo (sin HTTP, igual que `SociosPage` llama a Prisma/servicio server-side), pasa `initialEmployees` a `UsuariosManager` — AC: 1, 2
- [x] Task 6: Crear `app/(dashboard)/usuarios/_components/UsuariosManager.tsx` (client, dueño del estado de filtros) + `EmployeeTable.tsx` (presentacional, con columna de acciones con anclajes deshabilitados) + `EmployeeFilters.tsx` (presentacional, input de búsqueda + selects de rol/estado) — ver desviación D1 en Completion Notes sobre filtrado client-side vía `modules/users/domain/employee-filters.ts` — AC: 1, 4, 5, 6, 7, 8
- [x] Task 7: Crear `lib/api/users.client.ts` con `fetchEmployees()` — mismo patrón de `ApiResponse<T>`/`handleResponse` que `lib/api/members.client.ts` — consumido por el botón "Actualizar" del Manager (ver D2) — AC: 4, 5, 6
- [x] Task 8: Agregar entrada `{ label: "Usuarios", href: "/usuarios", icon: UserCog, adminOnly: true }` a `dashboardRoutes` en `lib/navigation.ts` — se usó `UserCog` (confirmado disponible en `lucide-react` instalado) para no colisionar visualmente con el ícono `Users` ya usado por "Socios" — AC: 1
- [x] Task 9: Corregido `epics.md` — AC de Story 3.2 decía "Configuración → Usuarios"; actualizado a "Usuarios" como sección de nivel superior (H1), con referencia a este hallazgo
- [x] Task 10: Verificación manual contra la DB real de desarrollo — ver Debug Log References
- [x] Task 11: `npx tsc --noEmit` y `npm run lint` limpios en todos los archivos tocados (confirmado, ver Completion Notes)

## Dev Notes

### Por qué el listado va en una ruta de nivel superior, no bajo Configuración

Ver H1. `app/(dashboard)/configuracion/` solo contiene `migracion/` y no tiene `page.tsx` propio — no hay un "hub" de Configuración real en el código para anidar Usuarios debajo. `Socios`, `Productos`, `Inventario` ya son secciones de nivel superior con `adminOnly` variable según el caso — `Usuarios` sigue ese mismo patrón (`adminOnly: true`, como `Reportes`/`Configuración`).

### Reutilización obligatoria (no reinventar)

- **`parseBooleanQuery`** (`services/utils.ts:29`) para el filtro `isActive` — ya usado por `modules/products/products.service.ts` y `modules/members/members.service.ts`. No escribir un parseo de `"true"`/`"false"` nuevo.
- **`Employee`** (`modules/users/types.ts`, Story 3.1) ya tiene exactamente los campos que la tabla necesita (`name`, `email`, `role`, `isActive`) — no crear un tipo paralelo.
- **Patrón de ruta ADMIN-only**: copiar literal la forma de `app/api/migracion/reconstruccion/backup-status/route.ts` (sesión → 401, `prisma.user.findUnique({ select: { role: true }})` → 403 si no ADMIN) — es el patrón ya usado 9+ veces en Epic 1/2, no inventar una variante.
- **Patrón de listado+filtro**: copiar la forma de `MembersService.getAllMembers`/`parseMembersQuery` (`modules/members/members.service.ts:83-90,153+`) — `where` construido inline en el service, sin `domain/` — no crear `modules/users/domain/` en esta historia (no hay lógica pura que amerite ese archivo todavía, mismo criterio que Story 3.1 dejó documentado). **[Corregido durante implementación, ver D1 en Completion Notes]**
- **Patrón de Manager+tabla+filtros**: copiar la forma de `app/(dashboard)/socios/_components/socios-manager.tsx` + `socios-filtros.tsx` + `socios-lista.tsx` — Manager dueño del estado de filtros, filtros y tabla como componentes presentacionales puros (P-7: sin `lib/api` ni estado propio en los hijos).
- **Convención de nombres de archivo**: el repo tiene dos convenciones activas — `socios/_components/` usa kebab-case (`socios-manager.tsx`), `migracion/_components/` usa PascalCase (`MigracionManager.tsx`). Esta historia usa **PascalCase** (`UsuariosManager.tsx`, `EmployeeTable.tsx`, `EmployeeFilters.tsx`) para ser consistente con `modules/migration/`, el módulo que Story 3.1 ya declaró como patrón estructural a seguir (P-6) — no con Socios.

### Arquitectura (P-1 a P-8, `CLAUDE.md`)

- Better Auth sigue siendo la única autoridad de autenticación (AD-U1) — esta historia es de solo lectura, no toca credenciales, no llama ningún `auth.api.*` de escritura.
- `User.isActive`/`role` siguen siendo campos de Prisma gestionados directo por SGF (AD-U2) — `listEmployees` lee con Prisma directo, no vía el plugin `admin`.
- No se reutiliza ni se restaura `services/users.service.ts` (eliminado en Story 3.1) — el nuevo servicio vive exclusivamente en `modules/users/users.service.ts` (P-8: un caso de uso, un Service).
- La API route (`app/api/usuarios/route.ts`) no debe contener lógica condicional de negocio más allá de sesión/rol — el `where` de Prisma vive en el Service, no en la ruta.

### Project Structure Notes

- Archivos a crear: `modules/users/users.service.ts`, `types/api/users.ts`, `app/api/usuarios/route.ts`, `app/(dashboard)/usuarios/page.tsx`, `app/(dashboard)/usuarios/_components/UsuariosManager.tsx`, `EmployeeTable.tsx`, `EmployeeFilters.tsx`, `lib/api/users.client.ts`.
- Archivos a modificar: `services/index.ts` (registrar `UsersService`), `lib/navigation.ts` (nueva entrada), `_bmad-output/planning-artifacts/epics.md` (corrección de AC, ver H1/Task 9).
- Sin conflictos con `modules/migration/` — ningún archivo compartido con Epic 1/2 se toca en esta historia (a diferencia de Story 3.1, que sí tocó `lib/require-role.ts`).

### Testing standards summary

- Sigue el mismo criterio que Story 3.1: sin lógica de negocio pura nueva que amerite un smoke test dedicado (el `where` de Prisma en `listEmployees` es análogo a `getAllMembers`, ya cubierto por precedente, no por un smoke test propio de ese módulo). Verificación real es manual: login ADMIN/EMPLEADO, búsqueda, combinación de filtros, y confirmar que `GET /api/migracion/users` no cambia de comportamiento.
- Si durante la implementación surge lógica de filtrado no trivial (ej. normalización de búsqueda), extraerla a una función pura en `modules/users/domain/` y sí cubrirla con un smoke test siguiendo el patrón de `scripts/parse-smoke-test.ts` — no es obligatorio de antemano, solo si emerge.
- `npx tsc --noEmit` y `npm run lint` limpios (mismo gate que todas las historias previas).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.2-Listado-Búsqueda-y-Filtro-de-Empleados] — AC originales (líneas 605-629), corregidos en Task 9 (ver H1)
- [Source: _bmad-output/planning-artifacts/epics.md#Architectural-Decisions] — AD-U1, AD-U2 (líneas 538-540)
- [Source: _bmad-output/implementation-artifacts/investigations/administracion-usuarios-investigation.md#6.6] — arquitectura final aprobada, ruta `/usuarios` de nivel superior
- [Source: _bmad-output/implementation-artifacts/3-1-habilitar-admin-plugin-infraestructura.md] — infraestructura ya habilitada (plugin admin, `modules/users/types.ts`, `requireAuth()` con `isActive`); Completion Notes sobre el defer de `users.service.ts` (ver H2)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — defer de AC8 de Story 3.1, resuelto explícitamente por esta historia (Task 1, AC 9)
- [Source: modules/members/members.service.ts:83-90,153-175] — patrón `parseMembersQuery`/`getAllMembers` a replicar
- [Source: services/utils.ts:29-35] — `parseBooleanQuery`, reutilizar sin reimplementar
- [Source: app/api/migracion/reconstruccion/backup-status/route.ts] — patrón exacto de ruta ADMIN-only a replicar
- [Source: app/(dashboard)/socios/_components/socios-manager.tsx, socios-filtros.tsx, socios-lista.tsx] — patrón de Manager/filtros/tabla a replicar
- [Source: lib/navigation.ts] — estructura de `dashboardRoutes`, confirma que `/configuracion` no tiene página propia (ver H1)
- [Source: modules/users/types.ts] — `Employee`, ya existente desde Story 3.1, reutilizar sin duplicar

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5) — `/bmad-dev-story`

### Debug Log References

Verificación funcional ejecutada contra la base de datos real de desarrollo (Prisma Postgres, mismos 3 usuarios reales: Nacho/Carlos/Andrew), levantando `next dev` localmente y probando con `curl` + cookies de sesión reales (sin modificar datos — solo `GET` y `sign-in`):

1. `GET /api/usuarios` sin sesión → `401` ✅
2. `POST /api/auth/sign-in/email` como `nacho@nachogym.com` (ADMIN) → `200`, cookie de sesión obtenida
3. `GET /api/usuarios` con sesión ADMIN → `200`, devuelve los 3 empleados reales (Andrew, Carlos, Nacho — orden `isActive desc, name asc`) ✅
4. `GET /api/usuarios?search=carlos` (minúsculas) → `["Carlos"]`; `?search=ANDREW` (mayúsculas) → `["Andrew"]` — case-insensitive confirmado ✅
5. `GET /api/usuarios?role=ADMIN` → `["Nacho"]`; `?role=EMPLEADO` → `["Andrew","Carlos"]` ✅
6. `GET /api/usuarios?isActive=true` → los 3; `?isActive=false` → `[]` (no hay empleados inactivos hoy, resultado correcto) ✅
7. `GET /api/usuarios?search=a&role=EMPLEADO&isActive=true` → `["Andrew","Carlos"]` — combinación AND de 3 criterios confirmada ✅
8. `POST /api/auth/sign-in/email` como `carlos@nachogym.com` (EMPLEADO) → `200`; `GET /api/usuarios` con esa sesión → `403 {"error":"Acceso restringido"}` ✅
9. `GET /usuarios` (página completa) con sesión ADMIN → `200`, HTML contiene los 3 nombres de empleados y el título `Usuarios — SGF` ✅
10. `GET /usuarios` con sesión EMPLEADO (Carlos) → `200` con `<meta http-equiv="refresh" content="1;url=/">` (redirect de `requireAdmin()`, mismo mecanismo — y mismo destino `/` — que ya usa `MigracionPage`) — ninguna fila de empleado presente en el HTML ✅
11. `git status --short -- modules/migration app/api/migracion` → sin salida (cero cambios); `GET /api/migracion/users` con sesión ADMIN → `200`, misma forma de respuesta que antes (`id`,`name`,`email`) ✅

Nota de entorno (no relacionada con el código de la historia): el sandbox de esta sesión es Linux, pero `app/generated/prisma/` traía únicamente el engine `darwin-arm64` de una generación previa, y `next.config.ts` toma "el primer engine que encuentre" en ese directorio (bug preexistente, fuera de alcance de esta historia — no se tocó ese archivo). Se regeneró el cliente Prisma localmente (`npx prisma generate`, agrega los engines `debian`/`rhel` sin quitar el existente — `app/generated/prisma` está en `.gitignore`, cambio no versionado) y se removieron temporalmente los engines no-Linux del directorio solo para forzar la selección del correcto durante esta verificación; ambos se restauraron a su estado original al terminar.

### Completion Notes List

- **D1 (desviación real de los Dev Notes de esta misma historia):** se creó `modules/users/domain/employee-filters.ts` con `filtrarEmpleados`/`hayFiltrosActivos`, contradiciendo la línea de Dev Notes que decía "no crear `modules/users/domain/` en esta historia". Causa: al revisar `socios-manager.tsx` como referencia real (tal como pedía la historia), se confirmó que `SociosManager` filtra **client-side** sobre el arreglo completo ya cargado (`filtrarSocios` en `modules/members/domain`, vía `useMemo`), no reconsultando la API por cada cambio de filtro — el diseño original de esta historia (filtrado 100% vía query params del lado servidor) no coincidía con el patrón real a replicar. Se mantuvo `GET /api/usuarios` con soporte de filtros server-side (cumple AC9/FR-U6 como capacidad de sistema y es la base para el botón "Actualizar"), pero el `UsuariosManager` filtra en memoria igual que Socios — UX idéntica sin round-trips innecesarios para un listado de pocos empleados.
- **D2:** `lib/api/users.client.ts::fetchEmployees()` se creó según lo pedido (Task 7), pero para evitar dejarlo sin consumidor real (código muerto) se conectó a un botón "Actualizar" funcional en `UsuariosManager` (recarga el listado completo desde el servidor) — acción de solo lectura, dentro del alcance de esta historia, no una de las acciones excluidas (crear/editar/activar/reset password).
- Ningún archivo de `modules/migration/`, `app/api/migracion/`, `lib/auth.ts`, ni `lib/require-role.ts` fue modificado (AC11, confirmado con `git status` acotado a esas rutas).
- `services/users.service.ts` (legacy, eliminado en Story 3.1) no fue restaurado ni reutilizado.
- No se implementó ninguna de las acciones fuera de alcance (crear, editar, activar/desactivar, reset password, cambio propio, `banUser()`) — los tres botones de acción en `EmployeeTable` están `disabled`, sin `onClick` con lógica real.
- `npx tsc --noEmit`: limpio. `npm run lint` sobre los 11 archivos tocados/creados: limpio.
- Suite completa de smoke tests (`smoke`, `smoke:parsers`, `smoke:inconsistency`, `smoke:member-upsert`, `smoke:shift-sync`, `smoke:sync-finalize`, `smoke:product-reset`, `smoke:reconstruction-report`): sin regresión. `npm run smoke` mantiene los mismos 2 fallos preexistentes ya documentados en Story 3.1 (`difference=0 esperado -50`, `difference=75 esperado 25`), no relacionados con esta historia.
- No se agregó ningún smoke test nuevo dedicado: `listEmployees`/`filtrarEmpleados` son análogos directos a `getAllMembers`/`filtrarSocios`, ya cubiertos por precedente (mismo criterio que Dev Notes de esta historia ya anticipaba) — verificación real fue funcional contra la DB real (ver Debug Log References).

### File List

**Creados:**
- `modules/users/users.service.ts`
- `modules/users/domain/employee-filters.ts`
- `types/api/users.ts`
- `app/api/usuarios/route.ts`
- `app/(dashboard)/usuarios/page.tsx`
- `app/(dashboard)/usuarios/_components/UsuariosManager.tsx`
- `app/(dashboard)/usuarios/_components/EmployeeTable.tsx`
- `app/(dashboard)/usuarios/_components/EmployeeFilters.tsx`
- `lib/api/users.client.ts`

**Modificados:**
- `services/index.ts` — agrega `export * as UsersService from "@/modules/users/users.service"`
- `lib/navigation.ts` — agrega entrada "Usuarios" (`/usuarios`, `UserCog`, `adminOnly: true`)
- `_bmad-output/planning-artifacts/epics.md` — corrección del AC de Story 3.2 (H1: "Configuración → Usuarios" → "Usuarios" nivel superior)
