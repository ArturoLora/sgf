# Story 2.1: Modo de Reconstrucción y Configuración de Respaldo

Status: done

## ⚠️ Nota de identificador duplicado

Ya existe en este repositorio `_bmad-output/implementation-artifacts/2-1-cash-withdrawal-model.md` ("Story 2.1: Modelo CashWithdrawal"), de un roadmap distinto (hardening post-piloto), **no relacionado con la Epic 2 de migración de epics.md**. Ambas historias comparten el identificador "2.1" por pertenecer a fuentes de planeación distintas. El archivo de esta historia usa un slug distinto para no sobrescribir nada, pero cualquier búsqueda futura por "Story 2.1" debe desambiguar por nombre de archivo, no solo por número.

## Story

As an administrador de SGF,
I want seleccionar el Modo Reconstrucción y configurar un respaldo de base de datos antes de que se elimine cualquier dato,
So that tenga una ruta de recuperación documentada antes de ejecutar cambios irreversibles en la base de datos.

## Alcance

**Incluido:** habilitar la selección de "Modo Reconstrucción" en el wizard, advertencias persistentes, preview de lo que se eliminará/conservará, estrategia de respaldo (pg_dump si el entorno lo permite, o confirmación explícita si no), y la pantalla de confirmación final con su checkbox obligatorio. Esta historia deja el flujo **listo para ejecutar** la reconstrucción, pero no la ejecuta.

**No incluido en esta historia (historias siguientes de Epic 2):**
- El DELETE real de datos operativos.
- La reconstrucción/reimportación posterior al borrado.
- Las validaciones post-reconstrucción (FR19 completo).

**Reutilización obligatoria de Epic 1:** esta historia NO reimplementa parsers, adapters, ni lógica de sincronización. Los conteos de "qué se eliminará" son lecturas Prisma directas (Member/Shift/InventoryMovement/CashWithdrawal) — no requieren tocar `modules/migration/adapters/` ni `modules/migration/domain/`. Si una historia posterior de Epic 2 necesita reimportar desde xlsx, reutiliza `MigrationService.previewFiles()`/`syncMembers()`/`syncShifts()` tal como están.

## Hallazgos de análisis (documentados, no resueltos aquí)

Verificados contra el entorno real de este repo, no hipótesis.

| # | Hallazgo | Evidencia | Restricción que impone sobre esta historia |
|---|----------|-----------|---------------------------------------------|
| F1 | `pg_dump` **no está instalado** en el shell de desarrollo/CI actual (`pg_dump: orden no encontrada`). La base de datos es un Postgres administrado por Prisma (`db.prisma.io:5432`), alcanzable con conexión directa vía `DATABASE_URL` (`prisma migrate status` funciona sin una `directUrl` separada, lo cual es buena señal de compatibilidad, pero **no está verificado que `pg_dump` pueda conectarse y volcar ese host** — depende del entorno de ejecución real de la app, que puede no ser este shell). | `which pg_dump` → exit 127; `prisma.config.ts`/`schema.prisma` sin `directUrl`; `npx prisma migrate status` conecta directo a `db.prisma.io` | La rama "sin `pg_dump` disponible" de NFR6/AC4 **debe funcionar correctamente y probarse de verdad**, no tratarse como caso secundario — en el entorno donde se generó esta historia, es la rama que realmente se ejecutaría hoy. La detección de disponibilidad de `pg_dump` debe hacerse en tiempo de ejecución (intentar invocarlo y capturar el fallo), nunca asumirse por variable de entorno o nombre de plataforma. |
| F2 | No existe ninguna infraestructura previa de backup/pg_dump en el código (`grep` sobre todo el repo — cero resultados). | búsqueda en `services/`, `modules/`, `app/` | Esta historia construye la capacidad desde cero — no hay patrón existente que reutilizar más allá del patrón general ADMIN-only de rutas API ya usado en Epic 1. |
| F3 | FR10 dice que `Product` es **opcional** en la reconstrucción ("el administrador elige si re-importar productos o conservar el catálogo existente"), pero el AC de preview de esta historia en epics.md solo enumera socios/cortes/movimientos/retiros — sin mención de `Product` ni de un toggle. | epics.md — FR10 vs. AC de Story 2.1 | El preview de "qué se eliminará" de **esta** historia no incluye `Product` en el conteo ni implementa el toggle de "re-importar vs. conservar catálogo" — esa decisión pertenece a Story 2.2 ("Ejecución de Reconstrucción Completa"). No diseñar aquí esa UI. |
| F4 | Los conteos de "qué se eliminará/conservará" (Member, Shift, InventoryMovement, CashWithdrawal, User) no existen todavía como función de servicio — son lecturas Prisma triviales, no relacionadas con parsers/adapters. | inspección de `modules/migration/migration.service.ts` actual | Nueva función de conteo, de solo lectura, en `migration.service.ts` (mismo archivo orquestador, no un módulo nuevo) — no requiere adapters ni domain model nuevo. |

## Acceptance Criteria

### Selección de modo

1. **Given** el admin está en el inicio del wizard de Migración,
   **When** selecciona "Modo Reconstrucción",
   **Then** el wizard muestra un banner de advertencia ámbar persistente (visible en todos los pasos siguientes de este modo): "Este modo eliminará todos los datos operativos. Los usuarios, autenticación y configuración serán preservados."

### Preview de borrado/conservación

2. **Given** el Modo Reconstrucción está activo,
   **When** se carga el paso de preview de borrado,
   **Then** el wizard muestra conteos exactos leídos en tiempo real de la base de datos: "Se eliminarán: N socios, M cortes, K movimientos, P retiros de caja. Se conservarán: X usuarios (sin modificar), autenticación, sesiones, y configuración del sistema." — sin incluir `Product` en este conteo (ver F3).

3. **Given** el preview de borrado se está calculando,
   **When** se ejecutan las consultas de conteo,
   **Then** son de solo lectura — cero escrituras, cero borrados, cero llamadas a `previewFiles`/`syncMembers`/`syncShifts`.

### Estrategia de respaldo

4. **Given** el servidor tiene el binario `pg_dump` accesible y `DATABASE_URL` configurado,
   **When** el admin llega al paso de respaldo,
   **Then** se muestra un botón "Generar Respaldo Ahora", y al hacer clic, `pg_dump` se ejecuta y el resultado muestra: ruta del archivo, tamaño, y el comando de restauración a ejecutar.

5. **Given** el entorno NO tiene `pg_dump` disponible (verificado en tiempo de ejecución, ver F1),
   **When** el admin llega al paso de respaldo,
   **Then** el botón se reemplaza por un checkbox obligatorio: "No es posible generar un respaldo automático en este entorno. Entiendo que soy responsable de recuperar los datos si la reconstrucción falla." — y el admin debe marcarlo para continuar.

6. **Given** intentar generar el respaldo falla a mitad de proceso (ej. `pg_dump` fue detectado como disponible pero la ejecución real falla — timeout, permisos, conexión rechazada),
   **When** ocurre el error,
   **Then** el wizard no debe fingir que el respaldo existe — debe mostrar el error y ofrecer la misma ruta de confirmación explícita que la rama "sin `pg_dump`" (AC5), nunca avanzar silenciosamente como si el respaldo se hubiera generado.

### Confirmación final

7. **Given** el respaldo fue generado exitosamente, o el checkbox de reconocimiento (AC5) fue marcado,
   **When** se carga el paso de confirmación final,
   **Then** aparece un componente con estilo destructivo (visualmente distinto del resto del wizard) con un checkbox separado: "Entiendo que esta acción eliminará los datos operativos de forma permanente", y un botón "Eliminar y Reconstruir" (no un label genérico como "Continuar").

8. **Given** el admin no ha completado tanto el respaldo/reconocimiento (AC4/AC5) como el checkbox de confirmación final (AC7),
   **Then** el botón "Eliminar y Reconstruir" permanece deshabilitado y no puede pulsarse.

9. **Given** el admin completa ambos requisitos,
   **When** el botón se habilita,
   **Then** al pulsarlo, esta historia se detiene ahí — **no ejecuta ningún DELETE**; la ejecución real es responsabilidad de la siguiente historia de Epic 2 (Story 2.2). El estado necesario (confirmaciones, ruta de respaldo si existe) debe quedar disponible para que esa historia lo consuma sin repetir esta pantalla.

### Integridad arquitectónica

10. **Given** cualquier parte de este flujo ejecuta,
    **When** corre el código,
    **Then** no importa adapters de `modules/migration/adapters/` ni reimplementa lógica de parseo/sincronización — solo usa Prisma directamente (conteos, y opcionalmente invocación de `pg_dump` como proceso externo) y el patrón ADMIN-only ya establecido en Epic 1.

## Tasks / Subtasks (nivel arquitecto — el diseño detallado se define en dev-story)

- [x] Task 1: Función de servicio de solo lectura para conteos de reconstrucción (Member, Shift, InventoryMovement, CashWithdrawal a eliminar; User a preservar) — AC: 2, 3
- [x] Task 2: Mecanismo de detección de disponibilidad de `pg_dump` en tiempo de ejecución (no asumir por entorno) — AC: 4, 5
- [x] Task 3: Endpoint/acción para ejecutar `pg_dump` como proceso externo cuando está disponible, capturando éxito (ruta/tamaño/comando de restauración) y fallo real en ejecución (no solo en detección) — AC: 4, 6
- [x] Task 4: UI — selector de "Modo Reconstrucción" + banner de advertencia persistente — AC: 1
- [x] Task 5: UI — paso de preview de borrado/conservación con los conteos reales — AC: 2, 3
- [x] Task 6: UI — paso de respaldo con las dos ramas (botón pg_dump / checkbox de reconocimiento) y manejo de fallo de ejecución — AC: 4, 5, 6
- [x] Task 7: UI — paso de confirmación final con estilo destructivo, checkbox separado, botón "Eliminar y Reconstruir" con gating de habilitación — AC: 7, 8, 9
- [x] Task 8: Definir el punto de entrada de Modo Reconstrucción en `MigracionManager.tsx` (o wizard separado) sin romper el flujo de Sincronización ya aprobado (Epic 1) — AC: 10
- [x] Task 9: Smoke tests de las funciones puras/de conteo nuevas — sin diseñar aquí el detalle de casos

## Dev Notes

### Consistencia con Epic 1

- Mismo patrón ADMIN-only (`requireAdmin()` en page.tsx, `session.user.role === "ADMIN"` en rutas API) usado en Stories 1.1–1.6.
- `migration.service.ts` sigue siendo el orquestador — las nuevas funciones de conteo/backup viven ahí o en un archivo hermano bajo `modules/migration/`, nunca lógica de negocio en la ruta API.
- El wizard de Sincronización (`MigracionManager.tsx`) y el flujo de Reconstrucción son modos **distintos** del mismo módulo de Importación de Datos — esta historia debe decidir en dev-story si es una rama del mismo componente o un componente separado, sin duplicar `FileUploadStep`/adapters/parsers ya existentes si Reconstrucción también necesita subir archivos (lo necesitará en Story 2.2, no en esta historia).

### Project Structure Notes

- Archivos a extender: `modules/migration/migration.service.ts` (conteos + backup), `types/api/migracion.ts` (nuevos contratos), rutas nuevas bajo `app/api/migracion/` (ej. conteo de reconstrucción, ejecución de pg_dump), componentes nuevos bajo `app/(dashboard)/configuracion/migracion/_components/`.
- Sin conflictos detectados con la estructura unificada del proyecto.

### Testing standards summary

- Smoke tests (`tsx`, sin DB) para cualquier función pura nueva (ej. formateo del comando de restauración, cálculo de tamaño legible).
- La función de conteos y la ejecución de `pg_dump` tocan DB/proceso externo — requieren verificación manual contra el entorno real, igual que Stories 1.4–1.6. **No asumir que la detección de `pg_dump` funciona solo porque compila** — probar explícitamente en un entorno sin el binario (F1 ya confirma que el entorno de desarrollo actual es ese caso) y, si es posible, en uno que sí lo tenga.
- `npx tsc --noEmit` y `npm run lint` limpios; regresión: toda la suite `smoke:*` existente debe seguir pasando (esta historia no debe tocar `modules/migration/adapters/` ni `modules/migration/domain/transformers/`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-21-modo-de-reconstrucción-y-configuración-de-respaldo]
- [Source: _bmad-output/planning-artifacts/epics.md — NFR2, NFR3, NFR6, FR8, FR9, FR10]
- [Source: prisma/schema.prisma — models Member, Shift, InventoryMovement, CashWithdrawal, User]
- [Source: lib/require-role.ts — patrón `requireAdmin()` ya usado en Epic 1]
- [Source: _bmad-output/implementation-artifacts/1-1-configuracion-modulo-importacion-analisis-archivos.md — patrón de ruta API ADMIN-only a replicar]
- Evidencia verificada en esta sesión: `pg_dump` no instalado en el shell de desarrollo actual; DB conectada directamente a `db.prisma.io:5432` sin `directUrl` separada.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Confirmado con datos reales, no solo lógica: `checkPgDumpAvailability()` devuelve `{available:false, reason:"spawn pg_dump ENOENT"}` en este entorno — es exactamente la rama F1 anticipaba como la que hoy se ejecutaría de verdad. `runDatabaseBackup()` lanza el mismo error al intentar ejecutarlo, confirmando que el camino de fallo de AC6 (no solo el de "no disponible" de AC5) también es alcanzable y correctamente manejado.
- Corrección de seguridad aplicada durante la implementación (no en la historia original, descubierta al escribir el código): el `restoreCommand` inicialmente interpolaba `DATABASE_URL` completo (con credenciales) en un string que viajaría al cliente en la respuesta JSON. Se cambió a referenciar `$DATABASE_URL` simbólicamente — el secreto nunca sale del servidor. Esto no es una contradicción de la historia, es una corrección aplicada in situ por ser una fuga de credenciales evidente (OWASP).

### Completion Notes List

- Los 10 AC se cumplen. `reconstruction.service.ts` es un archivo hermano nuevo de `migration.service.ts` (no lo modifica) — Reconstrucción es un caso de uso distinto (P-2), y esta separación evita cualquier riesgo de romper Sync mode (Epic 1 queda con 0 líneas tocadas, verificado con `git diff --stat`).
- Preview de reconstrucción (AC2/3) verificado contra la DB real: los conteos de `getReconstructionPreview()` coinciden exactamente con conteos Prisma directos (8 socios, 4 cortes, 96 movimientos, 0 retiros, 3 usuarios en el entorno de desarrollo).
- `Product` deliberadamente excluido del preview (F3) — decisión de scope, no un olvido.
- Modo Reconstrucción se integra en `MigracionManager.tsx` vía un selector de modo al inicio (`mode: "sync" | "reconstruction" | null`) — el JSX del wizard de Sincronización existente no se modificó, solo se envolvió condicionalmente.
- AC9 respetado literalmente: el botón "Eliminar y Reconstruir" en `FinalConfirmationStep.tsx` no invoca ningún endpoint de borrado — solo cambia a un estado local de "confirmación registrada", dejando la ejecución real para Story 2.2.
- AD-1 intacto: `reconstruction.service.ts` no importa adapters, exceljs, ni domain/transformers de migración — solo Prisma y `child_process`.

### File List

**Nuevos:**
- `modules/migration/reconstruction.service.ts`
- `app/api/migracion/reconstruccion/preview/route.ts`
- `app/api/migracion/reconstruccion/backup-status/route.ts`
- `app/api/migracion/reconstruccion/backup/route.ts`
- `app/(dashboard)/configuracion/migracion/_components/ReconstructionManager.tsx`
- `app/(dashboard)/configuracion/migracion/_components/DeletionPreviewStep.tsx`
- `app/(dashboard)/configuracion/migracion/_components/BackupStep.tsx`
- `app/(dashboard)/configuracion/migracion/_components/FinalConfirmationStep.tsx`

**Modificados:**
- `types/api/migracion.ts` — `ReconstructionPreviewSchema`, `PgDumpAvailabilitySchema`, `BackupResultSchema`
- `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` — selector de modo al inicio, sin tocar el wizard de Sincronización existente

## Code Review

Hallazgo Crítico: `runDatabaseBackup()` filtraba `DATABASE_URL` completo (con credenciales) en el mensaje de error cuando `pg_dump` existía pero fallaba en ejecución (escenario AC6) — confirmado con Node real, no hipótesis. Fix aplicado en commit `2cfb65c`: el error de `execFile` se registra server-side y se relanza saneado, sin ningún dato de conexión. Verificado con un `pg_dump` falso que falla en ejecución: la credencial no llega al caller. Sin otros hallazgos bloqueantes. Approved.
