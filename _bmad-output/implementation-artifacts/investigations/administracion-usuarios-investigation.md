# Investigación: Módulo de Administración de Usuarios y Empleados

**Fecha:** 2026-07-02
**Autor:** Mary (Business Analyst)
**Estado:** Investigación + arquitectura completas y aprobadas. Sin historias abiertas, sin código implementado. Lista para generar Epic 3.

## Resumen ejecutivo

Hoy SGF **no tiene ningún mecanismo funcional para crear o administrar empleados** desde la aplicación. Existe una capa de servicio (`services/users.service.ts`) con las funciones esperadas (`createUser`, `updateUser`, `toggleUserStatus`, `getAllUsers`, `getActiveUsers`), pero **no está conectada a ninguna ruta API ni pantalla** — es código muerto. Además, su implementación de `createUser` tiene un defecto que la haría inutilizable tal cual está: crea la fila `User` directamente con Prisma pero nunca crea la fila `Account` con la contraseña, por lo que **el usuario creado no podría iniciar sesión nunca**. El único mecanismo que hoy funciona para dar de alta un usuario que sí puede loguearse es `prisma/seed.ts`, vía `auth.api.signUpEmail()` de Better Auth — un script, no una funcionalidad de producto.

La buena noticia: Better Auth 1.4.12 (ya instalado) trae de fábrica todo lo que este módulo necesita — un plugin `admin` completo (`createUser`, `setUserPassword`, `setRole`, `banUser`, `listUsers`, `removeUser`) que no está habilitado, y `changePassword` en el core (auto-servicio) tampoco usado. No hace falta construir nada de autenticación desde cero — el trabajo real es: habilitar el plugin correcto, decidir cómo convive con el campo `isActive` que SGF ya usa, y construir la UI/rutas que faltan.

## 1. Estado actual — evidencia, no suposición

### 1.1 Better Auth — configuración real

`lib/auth.ts`:
```ts
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 3 }, // comentario en código: "Permitir '123'"
  plugins: [nextCookies()],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
```

- Único plugin activo: `nextCookies()` (necesario para Server Actions/Route Handlers de Next.js). **El plugin `admin` de Better Auth no está habilitado**, aunque está instalado como parte del paquete (`node_modules/better-auth/dist/plugins/admin/`).
- `minPasswordLength: 3` — política de contraseña deliberadamente débil, con comentario explícito reconociendo que permite "123". Aceptable para desarrollo/piloto interno, **riesgo real si se expone fuera de una red controlada**.
- `lib/auth-client.ts`: cliente mínimo, sin plugins del lado cliente (`createAuthClient()` sin opciones).

### 1.2 Estructura real de User / Account / Session (`prisma/schema.prisma`)

```
User:  id, name, email (unique), emailVerified, image, role (enum Role: ADMIN|EMPLEADO),
       isActive (default true), createdAt, updatedAt
       → sessions[], accounts[], shifts[], inventoryMovements[], cashWithdrawals[]

Session: id, expiresAt, token (unique), ipAddress, userAgent, userId → User (onDelete: Cascade)

Account: id, accountId, providerId, userId → User (onDelete: Cascade),
         accessToken, refreshToken, idToken, password (String?, hasheado por Better Auth), ...

Verification: id, identifier, value, expiresAt (usado por Better Auth para flujos de verificación/OTP)
```

Puntos clave:
- **`User` no tiene campo `password`** — la contraseña vive en `Account.password`, gestionada exclusivamente por Better Auth. Cualquier creación de usuario que no pase por la API de Better Auth deja al usuario sin credencial utilizable.
- `role` y `isActive` son campos **custom de SGF**, no parte del modelo base de Better Auth — hay que seguir gestionándolos con Prisma directo (como ya hace `seed.ts` y `requireAdmin()`), el plugin `admin` de Better Auth no los conoce de forma nativa salvo que se configuren como "additional fields".
- `Shift.cashierId`, `InventoryMovement.userId`, `CashWithdrawal.userId` referencian `User.id` **sin `onDelete: Cascade`** (confirmado durante Epic 2 — mismo hallazgo que ahí). Esto significa que **la base de datos ya impide, a nivel de FK real de Postgres, borrar un usuario con historial relacionado** — un `DELETE` fallaría con violación de FK antes de que cualquier código de aplicación tuviera que prevenirlo explícitamente.

### 1.3 Flujo de login actual

`app/login/page.tsx` — client component simple: formulario email/password → `authClient.signIn.email()` → redirige a `/`. Funcional, pero:
- **Expone credenciales de prueba directamente en la pantalla de login** ("Usuarios de prueba: nacho@nachogym.com / 123", "carlos@nachogym.com / 123") — aceptable para desarrollo, **inaceptable si el pilotos ve esta pantalla o si se acerca a producción**.
- `authClient` en todo el código solo se usa para `signIn.email()` (login) y `signOut()` (`components/layout/header.tsx`) — **cero uso de `changePassword`, `updateUser`, o cualquier función de autoservicio**.

### 1.4 Creación de usuarios — estado real

Dos caminos existen en el código, ninguno utilizable hoy desde la aplicación:

1. **`prisma/seed.ts`** (script, no producto): usa `auth.api.signUpEmail({ body: { name, email, password } })` — el camino **correcto**, porque `signUpEmail` crea tanto `User` como `Account` con password hasheado. Luego asigna `role`/`isActive` con `prisma.user.update()` directo, porque esos campos son custom de SGF.
2. **`services/users.service.ts::createUser()`** — **no reutilizable tal cual**: hace `prisma.user.create()` directo con un `id` generado manualmente (`user_${Date.now()}_${random}`), recibe un parámetro `password` que **nunca usa**, y no crea ningún `Account`. Un usuario creado así no podría autenticarse jamás. Además, **esta función (y sus hermanas `updateUser`, `toggleUserStatus`, `getAllUsers`, `getActiveUsers`) no está conectada a ninguna ruta API ni componente** — verificado con grep en todo `app/`: el único lugar que las referencia es el barrel `services/index.ts`. Es código muerto.

### 1.5 Cambio / recuperación de contraseña

**No existe ningún flujo implementado**, ni de autoservicio ni administrado. Better Auth expone `changePassword` en su API core (confirmado en `node_modules/better-auth/dist/api/index.d.mts`) — disponible para usarse sin ningún plugin adicional, simplemente no está conectado a ninguna UI.

### 1.6 Manejo de roles

`enum Role { ADMIN, EMPLEADO }` en el schema. Se consulta con `prisma.user.findUnique({ select: { role } })` en cada punto que lo necesita — patrón ya establecido y usado consistentemente en las 9 historias de Epic 1/2 de Migración (`requireAdmin()`, las rutas ADMIN-only de `app/api/migracion/`). No hay lógica de permisos granular más allá de este booleano efectivo (ADMIN vs. no-ADMIN).

### 1.7 Middleware de autorización

**No existe `middleware.ts`** en la raíz del proyecto. La autorización se resuelve exclusivamente a nivel de layout/página con `requireAuth()`/`requireAdmin()` (`lib/require-role.ts`), llamadas explícitamente en cada server component que lo necesita. `app/(dashboard)/layout.tsx` ya llama `requireAuth()` para todo el grupo de rutas del dashboard.

### 1.8 Componentes, APIs y pantallas reutilizables

| Elemento | Ubicación | Reutilizable tal cual |
|---|---|---|
| `requireAuth()` / `requireAdmin()` | `lib/require-role.ts` | ✅ Sí — patrón ya probado en 9 historias |
| Patrón de ruta API ADMIN-only (sesión + rol) | cualquier ruta de `app/api/migracion/` | ✅ Sí — replicar tal cual |
| `GET /api/migracion/users` | `app/api/migracion/users/route.ts` (Story 1.3) | ⚠️ Parcial — ya lista usuarios activos para el dropdown de mapeo de empleados; el módulo nuevo probablemente necesita una versión más completa (con rol, estado, búsqueda), no reemplazar este endpoint que Migración ya depende de él |
| Patrón Manager + componentes presentacionales | cualquier `_components/` de `app/(dashboard)/*` | ✅ Sí — mismo patrón P-6/P-7 a seguir |
| `services/users.service.ts` | raíz de `services/` | ❌ No reutilizable tal cual — reescribir `createUser`/`updateUser` para usar la API de Better Auth, no Prisma directo |
| Componentes de tabla/filtro (`socios-manager.tsx` u otros) | `app/(dashboard)/socios/_components/` | ✅ Sí como referencia de patrón — SGF ya tiene una pantalla de listado+búsqueda+filtro consolidada que sirve de plantilla |

## 2. Riesgos

| # | Riesgo | Evidencia | Severidad |
|---|--------|-----------|-----------|
| R1 | `services/users.service.ts::createUser()` es código muerto y roto (nunca crea `Account`, ignora el parámetro `password`) — si alguien lo reutiliza sin revisar, crea usuarios que no pueden iniciar sesión. | Lectura directa del archivo | Alta si se reutiliza sin corregir; nula si se reescribe desde cero (recomendado) |
| R2 | El plugin `admin` de Better Auth y los campos custom de SGF (`role`, `isActive`) **no se conocen entre sí** de fábrica — hay que decidir explícitamente si `isActive` sigue siendo la fuente de verdad para "empleado deshabilitado" o si se migra al mecanismo `banUser`/`banned` del plugin (que añade sus propios campos al modelo `User`, requiriendo migración de schema). | `node_modules/better-auth/dist/plugins/admin/schema.mjs` (agrega campos `banned`, `banReason`, `banExpires` a `User` si se usa) | Media — decisión arquitectónica que debe tomarse antes de escribir código, no durante |
| R3 | `minPasswordLength: 3` es una política de contraseña real y activa hoy. Cualquier feature de "cambiar/reiniciar contraseña" heredará esa debilidad salvo que se decida explícitamente subirla. | `lib/auth.ts` | Media — aceptable para piloto interno, debe marcarse como pendiente antes de cualquier acercamiento a producción real |
| R4 | Credenciales de prueba hardcodeadas en la pantalla de login (`app/login/page.tsx`). | Lectura directa del archivo | Media — trivial de quitar, pero es una fuga de credenciales real si el login llega a verse fuera del equipo de desarrollo |
| R5 | No hay límite de intentos de login, ni 2FA, ni rate limiting visible en la configuración actual de Better Auth — el módulo de administración de usuarios no resuelve esto, pero cualquier expansión de superficie de autenticación (self-service password change, reset) amplifica la importancia de estos controles ausentes. | `lib/auth.ts` — sin plugins de seguridad adicionales | Media, fuera del alcance estricto de este módulo pero relacionado |
| R6 | El borrado físico de `User` con historial (`Shift`, `InventoryMovement`, `CashWithdrawal`) ya está bloqueado por FK real de Postgres (mismo patrón confirmado en Epic 2, H2) — pero si el módulo nuevo expone un botón "Eliminar" sin manejar el error de FK con un mensaje claro, el admin vería un error crudo de base de datos. | `prisma/schema.prisma` — relaciones sin `onDelete: Cascade` en esas tablas | Baja — mitigable con manejo de error explícito, no con lógica de negocio nueva |

## 3. Decisiones arquitectónicas propuestas (para aprobación, no implementadas)

**AD-1 (nuevo, para este módulo) — Usar la API server-side de Better Auth para todo lo que toque credenciales, nunca Prisma directo sobre `User`/`Account`.**
Crear/activar/reiniciar contraseña debe pasar por `auth.api.signUpEmail()`, `auth.api.changePassword()`, o el plugin `admin` (`auth.api.createUser()`, `auth.api.setUserPassword()`, `auth.api.setRole()`) — nunca `prisma.user.create()`/`prisma.account.create()` manual. Esto es exactamente lo que `seed.ts` ya hace bien y lo que el `services/users.service.ts` actual hace mal.

**AD-2 (nuevo) — Habilitar el plugin `admin` de Better Auth, pero mantener `role`/`isActive` como los campos de fuente de verdad de SGF.**
El plugin da `setRole`/`createUser`/`setUserPassword`/`removeUser` gratis y ya probados por la librería. Pero dado que SGF ya tiene 9 historias de Epic 1/2 (Migración) que leen `User.role`/`User.isActive` directo por Prisma, **no** conviene migrar a los campos `banned`/`banExpires` propios del plugin — se mantiene `isActive` como está, y se usa el plugin solo para las operaciones de autenticación/credencial (crear, resetear contraseña), no para el estado de "activo/inactivo" del empleado.

**AD-3 (nuevo) — Reescribir `services/users.service.ts` desde cero (o renombrar/mover a `modules/users/`) en vez de "arreglar" el actual.**
Dado que el archivo actual no tiene ningún consumidor, no hay riesgo de romper nada existente al reemplazarlo por completo con el patrón `modules/` establecido en Migración (P-6: mismo layout estructural — `users.service.ts`, `types.ts`, `domain/`).

**AD-4 (nuevo) — "Eliminar empleado" es siempre desactivación (`isActive = false`), nunca `DELETE` físico.**
Ya está reforzado por la base de datos (FK real, sin cascade) — se formaliza como regla de producto explícita en vez de dejar que el admin descubra el bloqueo por un error de FK. Si en el futuro se requiere borrado físico de empleados sin ningún historial, es una historia aparte con su propio análisis de qué tablas verificar primero.

## 4. Propuesta de alcance

**Incluido (propuesta, sujeta a aprobación):**
- CRUD de empleados por el admin: crear (vía Better Auth), editar (nombre/email/rol), activar/desactivar (`isActive`).
- Reinicio de contraseña por el admin (plugin `admin.setUserPassword`).
- Cambio de contraseña por el propio empleado (`changePassword` del core).
- Listado con búsqueda/filtro (por nombre, rol, estado).
- Página de detalle de empleado mostrando su estado, sin exponer la contraseña actual (nunca se puede leer, solo resetear).

**Fuera de alcance explícito de este módulo (para discusión futura, no ahora):**
- 2FA / MFA.
- Recuperación de contraseña por email (flujo "olvidé mi contraseña" no asistido por admin) — requiere configurar envío de correo, no existe hoy infraestructura de email en el proyecto (no se encontró ningún servicio de email en la investigación).
- Permisos granulares más allá de ADMIN/EMPLEADO.
- Auditoría de cambios de usuario (quién cambió el rol de quién y cuándo) — no hay modelo de auditoría en el schema, mismo hallazgo que H5 de Story 2.3 (Migración).
- Subir `minPasswordLength` y agregar rate limiting — recomendado pero es una decisión de política de seguridad, no de este módulo funcional.

## 5. Propuesta de épicas e historias (borrador, sin crear archivos de historia)

**Epic 3 (propuesta): Administración de Usuarios y Empleados**

- **3.1 — Habilitar plugin `admin` de Better Auth y definir el servicio de usuarios.** Configurar el plugin, decidir explícitamente convivencia con `isActive` (AD-2), construir `modules/users/users.service.ts` reemplazando el código muerto actual.
- **3.2 — Crear y editar empleados (UI + API ADMIN-only).** Formulario de alta (nombre, email, rol, contraseña inicial vía `signUpEmail`/`admin.createUser`), edición de nombre/email/rol.
- **3.3 — Activar/desactivar empleados.** Toggle de `isActive`, con manejo explícito de que esto **no** es un borrado — el empleado conserva su historial y su capacidad de ser referenciado (aunque no de iniciar sesión si se desactiva, decisión a confirmar en la historia).
- **3.4 — Gestión de contraseñas.** Reinicio por admin (`setUserPassword`) + cambio por el propio empleado (`changePassword`) en un flujo de "mi cuenta".
- **3.5 — Listado, búsqueda y filtro de empleados.** Pantalla principal del módulo, reutilizando el patrón Manager ya validado en Socios/Migración.

Cada una de estas se generaría como historia formal (`/bmad-create-story`) solo tras aprobar este documento — ninguna se ha creado todavía.

## 6. Decisiones arquitectónicas finales (aprobadas)

Verificado contra el código real de Better Auth 1.4.12 instalado (`node_modules/better-auth/dist/plugins/admin/admin.d.mts`) — los nombres de método citados abajo existen tal cual en el paquete, no son suposición.

### 6.1 Roles

Se mantiene el enum actual, sin ampliarlo todavía:

| Rol | Propósito | Permisos | ¿Inicia sesión? | Relación con Better Auth |
|---|---|---|---|---|
| `ADMIN` | Dueño/gerente — control total del sistema | Todo: Configuración, Migración, Reportes, y el nuevo módulo de Usuarios | Sí | `User.role = "ADMIN"`, verificado por `requireAdmin()` — sin cambios a ese mecanismo |
| `EMPLEADO` | Cajero/vendedor — operación diaria | Ventas, Cortes, Inventario básico. Sin acceso a Configuración/Usuarios/Reportes | Sí | `User.role = "EMPLEADO"` — cualquier página sin `requireAdmin()` explícito |

**Decisión:** no se crean roles nuevos (`ENTRENADOR`, `RECEPCION`, etc.) en este módulo. La investigación de Migración ya mostró que "entrenador" hoy es solo un nombre asociado a un tipo de membresía (`trainerName` en el parser de membresías) — no una identidad con acceso al sistema. Si en el futuro un rol nuevo necesita **login real**, la extensión es: (1) agregar el valor al enum `Role` de Prisma (migración aditiva, no rompe nada existente), (2) decidir en ese momento, con el caso de uso concreto en mano, qué páginas/rutas requieren ese rol. No se construye una tabla de permisos ni un sistema de roles genérico ahora — sería sobre-ingeniería para dos roles reales.

### 6.2 Modelo de Empleado

**Decisión:** extender `User` directamente (no crear un modelo `EmployeeProfile` separado), por consistencia con el precedente ya establecido — `role` e `isActive` ya viven en `User` y las 9 historias de Epic 1/2 de Migración ya asumen eso.

Campos nuevos a agregar (aditivos, todos `nullable`, no rompen nada existente):
- `phone String?` — teléfono del empleado.
- `notes String?` — observaciones libres del admin (ausencias, avisos, etc.).

Campos que **no** se agregan, con justificación:
- **Apellidos separados de `name`**: se mantiene `name` como campo único, igual que `Member.name` en Migración — no hay ninguna pantalla ni reporte hoy que necesite separar nombre/apellido, y dividirlo introduce complejidad (¿cómo se muestra en Cortes/Ventas ya construidos?) sin beneficio demostrado.
- **`hireDate` (fecha de contratación)**: `createdAt` ya existe pero no equivale a la fecha real de contratación para empleados migrados/heredados (ej. Andrew/Carlos ya trabajaban antes de que existiera su `User`). No se agrega hasta que un reporte concreto lo necesite — agregarlo ahora sería anticipar un requisito hipotético.
- **`username` separado**: el login ya usa `email` como identificador único; no hay necesidad de un segundo identificador.

Campos que pertenecen exclusivamente a Better Auth (nunca se tocan con Prisma directo salvo lectura): `emailVerified`, `image`, y todo `Account`/`Session` — se gestionan solo a través de `auth.api.*`.

### 6.3 Gestión de contraseñas

**Decisión — no reimplementar nada de autenticación, usar exclusivamente la API de Better Auth ya instalada:**

| Flujo | Mecanismo | Por qué |
|---|---|---|
| Crear empleado | `auth.api.createUser()` (plugin `admin`) | A diferencia de `signUpEmail()` (que `seed.ts` usa hoy), `createUser` del plugin admin está diseñado para que **un admin cree la cuenta de otra persona** sin generar una sesión de login en el navegador del admin. Usar `signUpEmail` aquí sería semánticamente incorrecto (es para auto-registro). |
| Contraseña inicial | El admin la escribe en el formulario de alta y se la comunica al empleado fuera del sistema (no hay infraestructura de email en el proyecto — confirmado en la investigación) | Simplicidad; mismo patrón que ya usa `seed.ts` con "123" |
| Empleado cambia su propia contraseña | `authClient.changePassword()` (core de Better Auth, sin plugin) | Ya viene incluido, solo falta una pantalla que lo llame — no existe hoy ningún consumidor |
| Admin reinicia contraseña de otro empleado | `auth.api.setUserPassword()` (plugin `admin`) | Método explícito para exactamente este caso — el admin no necesita conocer la contraseña anterior |
| Política mínima | Se sube `minPasswordLength` de `3` a `6` | Mejora mínima de higiene sin fricción real para un gimnasio pequeño; `3` con el comentario "permitir '123'" es una decisión de conveniencia de desarrollo, no de producto. Si el equipo prefiere mantener `3`, es un cambio de una línea reversible — no bloquea nada de la arquitectura. |

### 6.4 Alta, baja y edición

- **Crear:** solo ADMIN, vía `auth.api.createUser()` + fijar `role`/`isActive=true` con Prisma (igual que `seed.ts` ya hace con `role`).
- **Editar:** ADMIN puede editar `name`, `phone`, `notes`, `role`. **El email sí es editable** — no hay ninguna restricción técnica real (Better Auth solo lo usa como clave de búsqueda en `signIn.email()`, no está duplicado en ninguna otra tabla) — se actualiza con la misma validación de unicidad que el código muerto actual ya implementaba correctamente (`services/users.service.ts::updateUser`, lógica a conservar, no el resto del archivo).
- **Activar/Desactivar:** toggle de `isActive`. **Desactivar también revoca de inmediato todas las sesiones activas** de ese usuario vía `auth.api.revokeUserSessions()` (plugin `admin`, método confirmado en el paquete instalado) — un empleado dado de baja pierde acceso al instante, no cuando expire su sesión por sí sola. Como defensa adicional, `requireAuth()`/`requireAdmin()` (`lib/require-role.ts`) se extienden para verificar `isActive` en cada request, no solo `role` — cambio pequeño y aditivo al archivo ya compartido por todo el sistema, no un rediseño.
- **Eliminación física:** **nunca se ofrece en la UI.** No existe botón "Eliminar" para empleados — solo "Desactivar". Esto ya está reforzado por el schema real (`Shift.cashierId`, `InventoryMovement.userId`, `CashWithdrawal.userId` sin `onDelete: Cascade` — un `DELETE` fallaría por FK), pero se formaliza como decisión de producto explícita en vez de dejar que la base de datos sea la única barrera.

### 6.5 Integración

- **Better Auth:** el plugin `admin` se habilita en `lib/auth.ts` junto a `nextCookies()` ya existente. `role`/`isActive` siguen siendo campos de Prisma gestionados directamente por SGF, no por el plugin (evita duplicar el campo `banned` que el plugin agregaría si se le delegara ese control — ver AD-2 ya documentado arriba).
- **Migración:** sin cambios de contrato. `GET /api/migracion/users` (Story 1.3) sigue funcionando igual — cualquier empleado creado por el nuevo módulo aparece automáticamente disponible para el mapeo de cajero/vendedor en la próxima sincronización, sin ningún cambio adicional.
- **`Shift.cashierId` / `InventoryMovement.userId` / `CashWithdrawal.userId`:** no se ven afectados por desactivar un usuario — son referencias históricas por `id`, no por `isActive`. Un cajero desactivado sigue apareciendo correctamente en reportes y cortes pasados.
- **`sellerId`:** no existe como campo separado en el schema — el concepto de "vendedor" en `InventoryMovement` es el mismo `userId`. Se documenta para evitar confusión futura, no se crea un campo nuevo.
- **Futuras auditorías:** no se construye ningún modelo de auditoría en este módulo (mismo criterio que H5 de Story 2.3 de Migración — no crear infraestructura de auditoría sin un caso de uso concreto que la exija). Si se requiere, es una iniciativa aparte con su propio análisis.
- **Módulos futuros:** el mecanismo de extensión es el mismo enum `Role` (ver 6.1) — cualquier módulo nuevo que necesite un permiso distinto de ADMIN/EMPLEADO decide en ese momento si amplía el enum o reutiliza el binario existente.

### 6.6 Arquitectura final

Mismo patrón estructural que Migración (P-6, `CLAUDE.md`) — separación estricta entre orquestación (Prisma + Better Auth) y presentación:

```
modules/users/
  users.service.ts             # createEmployee, updateEmployee, setEmployeeActive,
                                # resetEmployeePassword, listEmployees — orquesta
                                # auth.api.* (credenciales) + prisma (role/isActive/phone/notes)
  types.ts                     # tipos de dominio del módulo

app/api/usuarios/
  route.ts                     # GET (listado+filtro), POST (crear) — ADMIN-only
  [id]/route.ts                # PATCH (editar) — ADMIN-only
  [id]/estado/route.ts         # PATCH (activar/desactivar + revocar sesiones) — ADMIN-only
  [id]/password/route.ts       # POST (admin reinicia contraseña) — ADMIN-only
  me/password/route.ts         # POST (el propio usuario cambia su contraseña) — cualquier sesión válida, NO admin-only

app/(dashboard)/usuarios/
  page.tsx                     # server component, requireAdmin(), fetch inicial
  _components/
    UsuariosManager.tsx        # client, dueño del estado — mismo patrón que SociosManager
    EmployeeTable.tsx          # presentacional
    EmployeeFormModal.tsx      # presentacional — crear/editar
    ResetPasswordModal.tsx     # presentacional

app/(dashboard)/mi-cuenta/
  page.tsx                     # cambio de contraseña propio — accesible a EMPLEADO y ADMIN

lib/api/
  users.client.ts              # fetch wrappers, mismo patrón que lib/api/*.client.ts existente

types/api/
  usuarios.ts                  # Zod schemas + tipos inferidos, mismo patrón que types/api/migracion.ts
```

**Separación dominio/autenticación:** `users.service.ts` es el único archivo que importa tanto `auth.api.*` como `prisma` para esta capacidad — ninguna ruta API ni componente llama a Better Auth ni a Prisma directamente (mismo principio P-2/P-4 ya aplicado en Migración). Si emerge lógica de validación pura real (ej. formato de teléfono), vive en `modules/users/domain/` sin importar Prisma ni Better Auth — no se crea ese archivo de antemano si no hay lógica real que ponerle.

**Modificación necesaria a código compartido existente:** `lib/require-role.ts` gana una verificación de `isActive` en `requireAuth()` (no solo en `requireAdmin()`) — es el único archivo fuera de `modules/users/`/`app/api/usuarios/`/`app/(dashboard)/usuarios/` que esta épica necesita tocar, y es un cambio pequeño, aditivo, sobre un archivo que ya es el punto único de verificación de sesión en todo el proyecto.

## 7. Riesgos restantes

| # | Riesgo | Mitigación decidida |
|---|--------|---------------------|
| R7 | Subir `minPasswordLength` a 6 podría invalidar contraseñas existentes más cortas (ej. "123" de los usuarios sembrados) | Better Auth valida la política solo al **establecer** una contraseña nueva, no retroactivamente sobre las ya guardadas — los usuarios actuales no se ven afectados hasta que cambien su contraseña |
| R8 | `revokeUserSessions()` al desactivar requiere que el endpoint de desactivación tenga permisos para invocar el plugin admin correctamente configurado | Se resuelve en implementación siguiendo la documentación del plugin ya verificada contra el paquete instalado — no es un riesgo de diseño, es un detalle de implementación normal |
| R9 | La pantalla "Mi Cuenta" (cambio de contraseña propio) es una superficie nueva sin `requireAdmin()` — cualquier EMPLEADO autenticado la usa | Correcto y esperado (es autoservicio, no administración) — se protege solo con `requireAuth()`, igual que el resto del dashboard |

## 8. Recomendación final

La arquitectura queda completamente decidida. Sin preguntas abiertas pendientes. Lista para `/bmad-create-epics-and-stories` o `/bmad-create-story` directo por historia (3.1–3.5 tal como se listaron en la sección 5), respetando el orden: 3.1 (habilitar plugin + servicio) debe ir primero porque 3.2–3.4 dependen de él.
