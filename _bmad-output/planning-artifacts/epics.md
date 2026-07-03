---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/implementation-artifacts/investigations/sgf-auditoria-migracion-investigation.md
  - _bmad-output/implementation-artifacts/investigations/post-pilot-roadmap-investigation.md
  - _bmad-output/implementation-artifacts/investigations/sgf-analisis-estado-investigation.md
  - user-request: "Épica Migración de Datos desde el Sistema Histórico hacia SGF"
---

# sgf - Epic Breakdown

## Overview

Este documento contiene el desglose completo de épicas e historias para la funcionalidad de **Migración de Datos desde el Sistema Histórico hacia SGF**, descomponiendo los requerimientos de las investigaciones de auditoría, la arquitectura existente y el roadmap técnico en historias implementables.

## Requirements Inventory

### Functional Requirements

FR1: El sistema debe permitir al administrador cargar uno o múltiples archivos xlsx desde la interfaz administrativa de SGF (sección Configuración → Migración de Datos).
FR2: El sistema debe detectar automáticamente el tipo de cada archivo según su estructura interna: archivo de socios (hoja "SOCIOS") vs archivo de cortes (hojas "Cierre", "Ventas", "Inventario", "Canceladas", "Retiros").
FR3: El sistema debe validar la estructura de cada archivo antes de proceder: existencia de hojas requeridas, columnas esperadas con sus tipos, y formato de datos críticos (fechas seriales Excel, strings de membresía, strings de forma de pago).
FR4: El sistema debe generar un resumen de análisis sin escribir en la base de datos, indicando: N socios encontrados, M cortes detectados (con sus folios y fechas), K SKUs en inventario, P cajeros/vendedores inferidos, Q usuarios ya existentes en SGF.
FR5: El sistema debe presentar una previsualización detallada de la migración que muestre, por cada entidad: el total a importar, una muestra de registros tal como serán creados en SGF, y las transformaciones aplicadas (ej. "EFECTIVO ANUALIDAD ESTUDIANTE ENE 2026" → ANNUAL_STUDENT).
FR6: El sistema debe generar un reporte de inconsistencias previo a la ejecución, identificando: cajeros/vendedores históricos sin cuenta de Usuario en SGF, variantes de membresía no reconocidas por el parser, registros con fechas inválidas, y cualquier FK que no pueda resolverse automáticamente.
FR7: El sistema debe proveer una pantalla de mapeo de empleados donde el administrador asocia manualmente cada nombre histórico de cajero/vendedor (ej. "ANDREW", "CARLOS") a una cuenta de Usuario existente en SGF antes de importar cortes.
FR8: El sistema debe requerir confirmación explícita del administrador mediante acción deliberada (checkbox + botón confirmado) antes de iniciar cualquier operación de borrado de datos operativos.
FR9: El sistema debe generar un respaldo de la base de datos (pg_dump) antes de ejecutar cualquier DELETE, y presentar al administrador las instrucciones para restaurarlo si fuera necesario.
FR10: En modo "Reconstrucción completa", el sistema debe reinicializar los datos operativos borrando: Member, Shift, InventoryMovement, CashWithdrawal, y opcionalmente Product. Debe preservar sin modificar únicamente: User, Session, Account, Verification, y configuración del sistema. Los productos pueden reconstruirse desde los archivos históricos cuando exista información suficiente (catálogo de SKUs en la hoja Inventario de los cortes); el administrador elige si re-importar productos o conservar el catálogo existente.
FR11: El sistema debe importar entidades en el orden obligatorio que respeta todas las dependencias de FK: (1) Usuarios inferidos no existentes, (2) Productos (upsert por nombre), (3) Socios, (4) Cortes en orden cronológico, (5) InventoryMovements por corte, (6) CashWithdrawals por corte.
FR12: El sistema debe parsear el campo "Membresia" denormalizado de socios.xlsx hacia el enum MembershipType de SGF, usando las reglas: "ANUALIDAD ESTUDIANTE" → ANNUAL_STUDENT, "ANUALIDAD GENERAL" → ANNUAL_GENERAL, "MENSUALIDAD ESTUDIANTE" → MONTH_STUDENT, "MENSUALIDAD GENERAL" → MONTH_GENERAL, "SEMANA" → WEEK. Registros con variantes no reconocidas deben quedar con membershipType nulo y registrarse como advertencias.
FR13: El sistema debe parsear strings de forma de pago que embeban nombre del vendedor en formato "MÉTODO (NOMBRE)" (ej. "EFECTIVO (CARLOS)") separando el método de pago (paymentMethod) del nombre del vendedor para mapearlo al User.id correspondiente.
FR14: El sistema debe convertir fechas seriales de Excel (número entero base 1900-01-01) a objetos DateTime de JavaScript correctamente, manejando el bug conocido de Excel que cuenta 1900 como año bisiesto.
FR15: El sistema debe soportar la importación de múltiples archivos xlsx de cortes simultáneamente, procesándolos en orden cronológico por la fecha de apertura del corte.
FR16: El sistema debe actualizar Product.gymStock con el valor "Exi Actual" del último corte importado al finalizar la migración.
FR17: El sistema debe registrar en metadata o en una variable de configuración el número de ticket más alto importado (max_ticket), para que el operador pueda inicializar el generador de tickets del SGF desde ese valor y evitar colisiones.
FR18: El sistema debe asignar todo el stock importado a gymStock cuando el archivo fuente no distingue entre ubicaciones GYM y WAREHOUSE.
FR19: El sistema debe ejecutar validaciones post-migración automáticas al concluir la importación: COUNT(member) == N socios en xlsx; COUNT(shift) == M cortes importados; para cada Shift importado, verificar que la suma de InventoryMovements ≈ totalSales del Shift; verificar ausencia de FK orphans.
FR20: El sistema debe generar un reporte final de resultados que muestre: registros importados exitosamente por entidad, registros fallidos con su razón específica, registros omitidos por ser duplicados, advertencias (campos sin equivalente almacenados en notes), y el resultado de cada verificación post-migración.
FR21: La funcionalidad de migración debe ser accesible desde el menú de Configuración del dashboard de SGF bajo "Migración de Datos", y debe estar restringida a usuarios con rol ADMIN.
FR22: La operación de migración debe ser idempotente — ejecutarla múltiples veces con los mismos archivos no debe crear duplicados. Implementar con upsert por clave natural: Member (memberNumber), Shift (folio), InventoryMovement (ticket + shiftId), Product (name).
FR23: Si un corte histórico contiene valores >0 en campos del legado sin equivalente permanente en SGF (Ventas Anticipo, Comisión a Pagar, Total Ventas Web), el sistema debe registrar esos valores en el campo Shift.notes como JSON estructurado en lugar de descartarlos silenciosamente.
FR24: La funcionalidad de importación debe ser una capacidad permanente de SGF, no una utilidad temporal de migración inicial. Debe soportar dos modos de operación distintos: (a) **Modo Sincronización** — importa/actualiza entidades desde archivos sin borrar datos existentes, resolviendo conflictos por upsert; útil para incorporar nuevos archivos históricos, actualizar información de socios, o sincronizar cambios del sistema anterior durante una transición gradual; (b) **Modo Reconstrucción** — reinicializa completamente la base de datos operativa y reconstruye desde cero a partir de los archivos proporcionados; útil para migración inicial, reconstrucción tras incidente, o reset de base de datos en entornos de desarrollo/demo. La idempotencia (FR22) garantiza que múltiples ejecuciones de cualquier modo produzcan un estado consistente determinista.

### NonFunctional Requirements

NFR1: La funcionalidad completa de migración debe cumplir los 8 principios arquitecturales de SGF — código de dominio en modules/migration/, rutas API en app/api/migracion/, UI en app/(dashboard)/configuracion/migracion/, sin cruzar capas.
NFR2: Las operaciones destructivas (DELETE masivo de datos operativos) solo deben ejecutarse si y solo si: (a) la validación completa fue exitosa, y (b) el administrador confirmó explícitamente. La generación de un respaldo previo es configurable por entorno: si el entorno soporta pg_dump (acceso al binario y DATABASE_URL), el sistema debe ofrecer la opción y recomendarla; si no está disponible, la migración puede continuar pero debe requerir una confirmación adicional explícita del administrador que reconozca la ausencia de respaldo automático.
NFR3: Cada fase de la migración debe ejecutarse en su propia transacción de Prisma. Fases: (A) DELETE operacional, (B) INSERT socios, (C) INSERT cortes [una transacción por corte]. Si (B) falla tras completar (A), el sistema debe alertar al administrador y presentar instrucciones de restauración desde el pg_dump.
NFR4: La funcionalidad debe ser accesible únicamente a usuarios con rol ADMIN, implementado mediante lib/require-role.ts, tanto en las rutas API como en la página del dashboard.
NFR5: El paso de análisis y previsualización (FR3, FR4, FR5, FR6) debe completarse sin ninguna escritura en la base de datos. Solo lectura del archivo xlsx + consultas read-only a Prisma para verificar existencia de entidades.
NFR6: El respaldo de base de datos (pg_dump) es una opción configurable por entorno, no un requisito bloqueante. Si está disponible, debe completarse antes de habilitar el botón de confirmación de borrado, y la instrucción de restauración debe ser visible para el administrador. Si no está disponible, el paso de respaldo se sustituye por una confirmación adicional donde el administrador reconoce explícitamente que no habrá respaldo automático y acepta la responsabilidad de recuperación.
NFR7: Los mensajes de error y advertencia deben ser específicos y accionables: indicar el archivo xlsx fuente, el número de fila o folio del registro, el campo problemático, y la acción requerida del administrador (ej. "Fila 47, socios.xlsx: Membresía 'TRIMESTRAL GENERAL' no reconocida — se importará con membershipType = null").
NFR8: No deben agregarse campos nuevos al schema de Prisma sin justificación operativa permanente. El único campo nuevo requerido (Product.taxRate) ya fue implementado en la Historia Convergencia-1. Los campos propuestos Shift.advanceSales, Shift.webSales y Shift.commissionAmount NO deben agregarse — los valores se almacenan en Shift.notes si son >0.
NFR9: La UI debe seguir los patrones de diseño existentes de SGF: componentes shadcn/ui, Tailwind CSS, patrón Manager (client component con estado) + componentes presentacionales sin estado ni llamadas API propias.
NFR10: Los archivos xlsx se procesan completamente en memoria del servidor durante la validación y ejecución. No se almacenan permanentemente en disco ni en servicios externos.
NFR11: El módulo de migración debe funcionar con los mismos mecanismos de autenticación de SGF (better-auth session) sin modificarlos ni duplicarlos.

### Additional Requirements

- **Nueva sección en dashboard:** La migración es una página dentro del área de Configuración del dashboard existente — no una herramienta separada ni un script de CLI. El administrador opera todo desde la UI de SGF.
- **Cliente Prisma canónico:** Todo código de módulo de migración debe importar desde `@/app/generated/prisma` (no de `@prisma/client` directamente), consistente con el resto de modules/.
- **Dependencia nueva: librería xlsx:** Se requiere una librería para parsear archivos xlsx en Node.js — `exceljs` (recomendada por su soporte de streaming y tipado) o `xlsx` (SheetJS). Esta dependencia debe justificarse en la historia que la introduzca.
- **Parsers como funciones puras:** Los parsers de dominio (membership-parser, payment-parser, date-converter) deben vivir en modules/migration/domain/ y ser funciones puras sin dependencias de Prisma ni HTTP — testables en aislamiento (cumple P-3).
- **Adapters separados de parsers:** Los adapters (member.adapter, shift.adapter) traducen del modelo canónico interno al input de Prisma — viven en modules/migration/adapters/ y sí importan tipos de Prisma.
- **Rollback explícito:** La estrategia de rollback tiene 3 niveles: (1) pg_dump pre-migración [Nivel 1 — obligatorio], (2) transacciones por fase [Nivel 2 — automático], (3) upsert/idempotencia [Nivel 3 — para re-ejecución]. No se implementa saga ni compensating transactions — el volumen no lo justifica.
- **Modelo canónico interno:** Los adapters deben producir un modelo canónico (CanonicalMember, CanonicalShift, CanonicalSale, etc.) como representación intermedia antes de escribir en Prisma. Esto desacopla el parsing del xlsx de la lógica de importación.
- **Prerequisito operativo externo:** Antes de poder ejecutar la migración completa, el equipo operativo debe proveer el historial completo de cortes xlsx (actualmente solo existen 2 muestras en docs/). Esta es una dependencia de datos, no de código.
- **Prerequisito de mapeo:** El administrador debe tener cuentas de Usuario creadas en SGF para todos los cajeros/vendedores históricos antes de importar cortes. El wizard debe verificar esto e impedirlo si faltan.

### Architectural Decisions

**AD-1 — Separación estricta entre formato de origen y lógica de negocio (Canonical Model Pattern)**

La lógica central de migración (validación, sincronización, reconstrucción, reportes) debe depender exclusivamente del **modelo canónico interno** — nunca directamente del formato de origen (xlsx, xml, csv, etc.).

Estructura mandatoria:

```
Archivo de origen (xlsx / xml / csv / ...)
  │
  ▼
Format Adapter (modules/migration/adapters/{formato}.adapter.ts)
  │  Única responsabilidad: transformar formato → modelo canónico
  │  No contiene lógica de negocio
  ▼
Modelo Canónico (CanonicalMember, CanonicalShift, CanonicalSale, etc.)
  │
  ▼
Migration Service (modules/migration/migration.service.ts)
  │  Depende solo del modelo canónico
  │  No importa nada de formato externo
  ▼
Prisma / DB
```

**Consecuencia directa:** Agregar soporte para un nuevo formato (XML, CSV, JSON de una API) requiere únicamente crear un nuevo `{formato}.adapter.ts` que implemente la misma interfaz del modelo canónico. La lógica de validación, sincronización, reconstrucción y reportes permanece sin cambios.

**Implementación en Story 1.1:** Al construir el módulo, definir las interfaces del modelo canónico como contratos TypeScript explícitos en `modules/migration/domain/canonical.types.ts` antes de implementar cualquier adapter. El xlsx adapter será la primera implementación concreta de esas interfaces.

---

### UX Design Requirements

UX-DR1: El wizard de migración debe implementarse como un flujo lineal de 5 pasos con navegación solo hacia adelante (no se puede retroceder una vez que comienza la ejecución): (1) Subir Archivos, (2) Análisis y Validación, (3) Resumen y Previsualización, (4) Confirmación de Borrado, (5) Ejecución y Reporte.
UX-DR2: El paso "Subir Archivos" debe aceptar múltiples archivos xlsx mediante drag-and-drop y selector de archivos. Debe indicar visualmente qué tipo detectó para cada archivo (ícono de socio vs ícono de corte).
UX-DR3: El paso "Análisis y Validación" debe mostrar el progreso del análisis en tiempo real (si el archivo es grande) y presentar el resumen y el reporte de inconsistencias como listas colapsables separadas: "Listo para importar", "Requiere mapeo manual", "Advertencias".
UX-DR4: El paso "Confirmación de Borrado" debe ser visualmente diferenciado del resto del wizard (fondo rojo/naranja, icono de advertencia). Debe listar exactamente qué se borrará (X registros de Socio, Y registros de Shift, Z movimientos) y qué se conservará. El botón de confirmar solo se habilita después de marcar un checkbox explícito.
UX-DR5: El paso "Ejecución" debe mostrar progreso con barras o indicadores por fase (Respaldo → Borrado → Importar socios → Importar corte 1/N → Validación post). Si una fase falla, debe detenerse y mostrar el error con instrucciones de restauración.
UX-DR6: El reporte final debe ser imprimible/exportable y debe mostrar claramente si la migración fue exitosa, parcialmente exitosa (con advertencias), o falló.
UX-DR7: La pantalla de mapeo de empleados (FR7) debe mostrar cada nombre histórico único junto a un selector desplegable con todos los Usuarios de SGF. Los nombres que ya coinciden exactamente con un User deben aparecer pre-mapeados y marcados en verde; los que no coinciden requieren selección manual.

### FR Coverage Map

| FR | Épica | Descripción |
|----|-------|-------------|
| FR1 | Epic 1 | Upload de archivos xlsx |
| FR2 | Epic 1 | Detección automática del tipo de archivo |
| FR3 | Epic 1 | Validación de estructura antes de proceder |
| FR4 | Epic 1 | Resumen de análisis sin writes en DB |
| FR5 | Epic 1 | Previsualización detallada de la importación |
| FR6 | Epic 1 | Reporte de inconsistencias pre-ejecución |
| FR7 | Epic 1 | Pantalla de mapeo de empleados |
| FR8 | Epic 2 | Confirmación explícita antes de borrar |
| FR9 | Epic 2 | Respaldo configurable (pg_dump o confirmación adicional) |
| FR10 | Epic 2 | Reinicialización de datos operativos |
| FR11 | Epic 1 | Orden de importación con dependencias FK |
| FR12 | Epic 1 | Parser membresía string → MembershipType |
| FR13 | Epic 1 | Parser "EFECTIVO (CARLOS)" → {paymentMethod, userId} |
| FR14 | Epic 1 | Convertidor fecha serial Excel → DateTime |
| FR15 | Epic 1 | Soporte múltiples cortes en orden cronológico |
| FR16 | Epic 1 | Actualizar Product.gymStock desde último corte |
| FR17 | Epic 1 | Registrar max(ticket) post-importación |
| FR18 | Epic 1 | Stock importado → gymStock |
| FR19 | Epic 2 | Validaciones post-migración automáticas |
| FR20 | Epic 2 | Reporte final con estadísticas completas |
| FR21 | Epic 1 | Acceso desde Configuración, solo ADMIN |
| FR22 | Epic 1 | Idempotencia por upsert (clave natural) |
| FR23 | Epic 1 | Valores sin equivalente → Shift.notes |
| FR24 | Epic 1+2 | Capacidad permanente: modo sync + modo reconstrucción |

*Todos los NFRs aplican a ambas épicas. UX-DR1–UX-DR5 corresponden a Epic 1; UX-DR5 (ejecución) y UX-DR6 (reporte final) se extienden en Epic 2. UX-DR7 (mapeo de empleados) pertenece a Epic 1.*

## Epic List

### Epic 1: Sincronización e Importación de Datos
El administrador puede cargar archivos xlsx históricos desde SGF, analizar su contenido, previsualizar la importación, resolver inconsistencias (cajeros sin cuenta, membresías no reconocidas), y ejecutar una importación en **Modo Sincronización** — que agrega y actualiza registros sin eliminar datos existentes. Es una capacidad cotidiana y permanente: puede ejecutarse con nuevos archivos en cualquier momento para mantener SGF sincronizado con el sistema histórico. Múltiples ejecuciones producen el mismo resultado determinista.

**FRs cubiertos:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR21, FR22, FR23, FR24 *(modo sincronización)*

---

### Epic 2: Reconstrucción Completa del Sistema
El administrador puede ejecutar una **Reconstrucción Completa** de la base de datos desde cero: con respaldo configurable previo al borrado (pg_dump si está disponible, o confirmación explícita adicional si no), reinicialización de datos operativos preservando usuarios, autenticación y configuración del sistema, importación ordenada completa desde los archivos cargados, y verificación automática post-importación con reporte de resultado auditado. Es una operación excepcional para migración inicial, reconstrucción tras incidente, o reset de entornos de desarrollo y demo.

**FRs cubiertos:** FR8, FR9, FR10, FR19, FR20, FR24 *(modo reconstrucción)*

---

### Epic 3: Administración de Usuarios y Empleados
El administrador puede crear, editar, activar/desactivar y gestionar las contraseñas de los empleados de SGF, y cada empleado puede cambiar su propia contraseña. Este módulo es la fuente oficial de identidad para autenticación, cortes, ventas, y el mapeo de empleados de Migración (Epic 1). Módulo nuevo, independiente de Migración/Reconstrucción — no modifica ninguna de sus capacidades, solo las alimenta con datos de usuario correctos.

**Requerimientos cubiertos:** FR-U1 a FR-U10 (ver "Requirements Inventory — Módulo de Usuarios" al final de este documento)

---

## Epic 1: Sincronización e Importación de Datos

El administrador puede cargar archivos xlsx históricos desde SGF, analizar su contenido, previsualizar la importación, resolver inconsistencias, y ejecutar importaciones en Modo Sincronización — agregando y actualizando registros sin eliminar datos existentes — de forma cotidiana y permanente.

---

### Story 1.1: Configuración del Módulo de Importación y Análisis de Archivos

As an administrador de SGF,
I want to upload xlsx files from the Importación de Datos section and see an immediate analysis of their content,
So that I know what historical data the system detected before making any changes.

**Acceptance Criteria:**

**Given** I am logged in as an ADMIN user
**When** I navigate to Configuración → Importación de Datos
**Then** the wizard loads at Step 1 with a file upload area
**And** a non-ADMIN user receives a redirect/403 when accessing the same URL

**Given** I upload a file containing a sheet named "SOCIOS" with the expected column headers
**When** the analysis completes
**Then** the system identifies the file type as "Archivo de Socios" and displays the record count found

**Given** I upload a file containing sheets "Cierre", "Ventas", "Inventario", "Canceladas", "Retiros"
**When** the analysis completes
**Then** the system identifies it as "Archivo de Corte" and displays the folio (from Cierre sheet) and opening date

**Given** I upload a file that does not match any expected structure
**When** the analysis runs
**Then** the system rejects it with the message: "Archivo no reconocido: no contiene las hojas esperadas (SOCIOS o Cierre/Ventas/Inventario)"
**And** the wizard does not advance

**Given** I upload multiple xlsx files simultaneously
**When** the analysis completes
**Then** each file is analyzed independently and displayed as a card with its detected type, record count, and status

**Given** one or more valid files are uploaded and analyzed
**When** the analysis step completes
**Then** zero records have been written to or deleted from the database
**And** the summary shows: N socios detectados, M archivos de corte, K cortes, P SKUs en inventario, Q cajeros/vendedores inferidos

---

### Story 1.2: Parsers de Dominio y Previsualización Completa de la Importación

As an administrador de SGF,
I want to see a detailed preview of how each historical record will be transformed and represented in SGF,
So that I can verify the interpretation is correct before committing any data.

**Acceptance Criteria:**

**Given** socios.xlsx contains "EFECTIVO ANUALIDAD ESTUDIANTE ENE 2026"
**When** the preview is generated
**Then** membershipType displays as "ANNUAL_STUDENT" and membershipDescription preserves the original string

**Given** socios.xlsx contains a membership string matching no known pattern (e.g. "PROMO ESPECIAL")
**When** the preview is generated
**Then** the record shows membershipType as null with a warning icon
**And** the record appears in the "Advertencias" section with the original string visible

**Given** a corte contains "EFECTIVO (CARLOS)" in the Forma Pago column
**When** the preview is generated
**Then** paymentMethod displays as "EFECTIVO" (CASH) and sellerName displays as "CARLOS" (pending resolution to User)

**Given** socios.xlsx contains a birthDate stored as an Excel serial number
**When** the preview is generated
**Then** birthDate displays as the correct human-readable date (correctly handling the Excel 1900 leap-year bug)

**Given** a corte's Inventario sheet shows "Exi Actual" values without location distinction
**When** the preview is generated
**Then** gymStock = Exi Actual and warehouseStock = 0, with a visible note explaining the assumption

**Given** the preview step runs for any valid file combination
**When** the preview completes
**Then** zero records have been written to or deleted from the database

---

### Story 1.3: Reporte de Inconsistencias y Mapeo de Empleados

As an administrador de SGF,
I want to see all data inconsistencies detected and manually resolve employee name mappings before importing,
So that the import produces complete records without silent data loss.

**Acceptance Criteria:**

**Given** the historical files contain employee names (e.g., "ANDREW", "CARLOS") that do not match any User in SGF
**When** I reach the inconsistency step
**Then** each unresolved name appears in a list with a "Requiere mapeo" badge

**Given** I see an unresolved employee name "ANDREW"
**When** I select an existing SGF User from the dropdown next to "ANDREW"
**Then** the mapping is saved and "ANDREW" shows a "Mapeado" badge in green

**Given** an employee name in the historical files exactly matches (case-insensitive) an existing User.name in SGF
**When** the inconsistency step loads
**Then** that name appears pre-mapped with a green indicator and requires no manual action

**Given** there is at least one employee name still showing "Requiere mapeo"
**When** the admin attempts to advance to the next wizard step
**Then** progression is blocked with the message: "Existen N cajero(s)/vendedor(es) sin mapear. La importación de cortes no puede continuar hasta resolver todos los mapeos."

**Given** the analysis found membership strings that did not parse to any known MembershipType
**When** the inconsistency step displays
**Then** those records appear in a collapsible "Advertencias" section showing: source file, row number, original string, and "Se importará con membershipType = null"

**Given** all inconsistencies are reviewed
**Then** the report groups them into: "Listo para importar", "Requiere mapeo manual", "Advertencias (información parcial)"

---

### Story 1.4: Importación Sincronizada de Socios

As an administrador de SGF,
I want to execute the sync import of members from the socios xlsx file,
So that historical member records are created or updated in SGF without deleting any existing data.

**Acceptance Criteria:**

**Given** all inconsistencies are resolved and the admin confirms the socios import
**When** the import executes
**Then** each socio is upserted by memberNumber: created if not exists, fields updated if the record exists
**And** no members are deleted from SGF

**Given** the import is running
**When** the process is active
**Then** the UI shows current progress: "Importando socios: N/M..."

**Given** the same socios.xlsx has already been imported once
**When** the admin runs the import again with identical file
**Then** no duplicate records are created
**And** any records with changed data (e.g., updated endDate) are updated

**Given** socio with memberNumber "FN435" is processed
**When** the import completes
**Then** Member.phone = null (if original was "Na" or "NA" or empty), Member.email = null (if original was "na" or "NA" or empty), Member.membershipType = correctly parsed enum value

**Given** one socio has an unparseable date field
**When** the import processes that record
**Then** that record is skipped and logged: "FN435: Fecha Inicio inválida — valor: '0'" 
**And** the import continues successfully with all remaining records

**Given** the import completes
**Then** the results show: N socios importados (nuevos), M actualizados (existentes), K fallidos (con razón por registro)

---

### Story 1.5: Importación Sincronizada de Cortes y Movimientos

As an administrador de SGF,
I want to import historical shifts, inventory movements, sales, and cash withdrawals from cortes xlsx files,
So that the operational history of the gym is available in SGF for reporting and auditing.

**Acceptance Criteria:**

**Given** multiple corte files are uploaded (e.g., FN-248 dated Jan 7 and FN-249 dated Jan 13)
**When** the import executes
**Then** cortes are processed in ascending chronological order by opening date

**Given** FN-248 corte file is processed
**When** the Shift record is created
**Then** Shift.folio = "FN-248", Shift.cashierId = resolved UUID from employee mapping, Shift.openingDate = correctly combined date + time from the Cierre sheet

**Given** a sale record contains Forma Pago = "EFECTIVO (CARLOS)" and "CARLOS" was mapped to User with id X
**When** the InventoryMovement is created
**Then** InventoryMovement.paymentMethod = CASH and InventoryMovement.userId = X

**Given** a corte has Ventas Anticipo = 150.00 (greater than zero)
**When** the Shift record is created
**Then** Shift.notes contains: {"legacyFields": {"advanceSales": 150.00, "source": "FN-248.xlsx"}}
**And** this record is counted as an "Advertencia" in the results report

**Given** FN-248 has already been imported once
**When** the admin imports the same file again
**Then** Shift FN-248 is not duplicated (upsert by folio)
**And** InventoryMovements are not duplicated (skipDuplicates by ticket + shiftId combination)

**Given** a ticket appears in the Canceladas sheet
**When** that InventoryMovement is created
**Then** InventoryMovement.isCancelled = true

**Given** the import of a specific corte fails after partial writes (e.g., DB error mid-import)
**When** the error occurs
**Then** that corte's transaction is rolled back entirely
**And** previously completed cortes remain intact and are not rolled back

---

### Story 1.6: Actualización Post-Importación y Finalización del Modo Sincronización

As an administrador de SGF,
I want the system to automatically update stock levels after a sync import and show me a complete summary report,
So that SGF reflects the current operational state from the imported data.

**Acceptance Criteria:**

**Given** at least one corte was successfully imported
**When** the post-import update runs
**Then** each Product.gymStock is updated to the "Exi Actual" value from the most recently imported corte's Inventario sheet, matched by product name

**Given** the import is complete
**When** the summary loads
**Then** the admin sees a visible notification: "El ticket más alto importado es [N]. Inicializa tu contador de tickets desde [N+1] para evitar colisiones."

**Given** the import completed (with or without warnings)
**When** the final summary is shown
**Then** it displays per-entity counts: socios importados/actualizados/fallidos; cortes importados; movimientos totales (ventas, ajustes, entradas, retiros); advertencias (campos sin equivalente guardados en notes)

**Given** the import ran in Modo Sincronización
**Then** the report header clearly labels it as "Modo Sincronización — sin borrado de datos previos"

---

## Epic 2: Reconstrucción Completa del Sistema

El administrador puede ejecutar una reconstrucción completa de la base de datos desde archivos históricos, con respaldo configurable, confirmación explícita, reinicialización de datos operativos preservando usuarios y autenticación, y verificación automática post-importación.

---

### Story 2.1: Modo de Reconstrucción y Configuración de Respaldo

As an administrador de SGF,
I want to select Reconstruction Mode and configure a database backup before any data is deleted,
So that I have a documented recovery path before making irreversible changes to the database.

**Acceptance Criteria:**

**Given** I am at the start of the wizard
**When** I select "Modo Reconstrucción"
**Then** the wizard displays a persistent amber warning banner with: "Este modo eliminará todos los datos operativos. Los usuarios, autenticación y configuración serán preservados."

**Given** Reconstruction Mode is active
**When** the deletion preview step loads
**Then** the wizard shows exact counts: "Se eliminarán: N socios, M cortes, K movimientos, P retiros de caja. Se conservarán: X usuarios (sin modificar), autenticación, sesiones, y configuración del sistema."

**Given** the server environment has the pg_dump binary accessible and DATABASE_URL is set
**When** the admin reaches the backup step
**Then** a "Generar Respaldo Ahora" button is displayed
**And** on click, pg_dump executes and the result shows: file path, file size, and the restoration command to run

**Given** the environment does NOT have pg_dump available (e.g., Vercel serverless)
**When** the admin reaches the backup step
**Then** the button is replaced by a mandatory acknowledgment checkbox: "No es posible generar un respaldo automático en este entorno. Entiendo que soy responsable de recuperar los datos si la reconstrucción falla."
**And** the admin must check this box to proceed

**Given** the backup was generated (or acknowledgment was checked)
**When** the final confirmation step loads
**Then** a destructive-styled confirmation appears with a separate checkbox: "Entiendo que esta acción eliminará los datos operativos de forma permanente"
**And** the confirmation button reads "Eliminar y Reconstruir" (not a generic label)
**And** this button remains disabled until the checkbox is checked

**Given** the admin has NOT completed both backup/acknowledgment AND the final confirmation checkbox
**Then** the "Eliminar y Reconstruir" button is disabled and cannot be clicked

---

### Story 2.2: Ejecución de Reconstrucción Completa

As an administrador de SGF,
I want to execute a full database reset followed by re-import of all entities from historical files,
So that the database is rebuilt from a known good state with all historical data correctly structured in SGF.

**Acceptance Criteria:**

**Given** all confirmations are complete and the admin clicks "Eliminar y Reconstruir"
**When** the reconstruction phase executes
**Then** Member, Shift, InventoryMovement, and CashWithdrawal records are deleted
**And** User, Session, Account, Verification records are untouched

**Given** the admin chose to re-import products from the historical files
**When** the Product reset executes
**Then** Product records are deleted and recreated from the Inventario sheet SKU names
**And** Product.taxRate from any previously classified product with a matching name is preserved via upsert (not reset to 0)

**Given** deletion is complete
**When** the import phase begins
**Then** the same parsers and adapters from Epic 1 are used to import entities in FK dependency order: Users (inferred, if not existing) → Products → Members → Shifts → Movements → Withdrawals

**Given** the import is running
**When** each phase completes
**Then** the UI shows phase-level progress: "Eliminando datos... ✓ → Importando socios (N/M)... → Importando corte 1/K... → Finalizando..."

**Given** the reconstruction succeeds in the DELETE phase but fails during the Members import phase
**When** the error occurs
**Then** the system stops the import
**And** displays: "La base de datos fue vaciada pero la importación de socios falló. Restaura desde el respaldo para recuperar el estado anterior."
**And** shows the restoration command (if a backup was generated)

**Given** the reconstruction has been run once successfully
**When** the admin runs it again with the same files
**Then** the resulting state is identical to the first run (same counts, same records, no duplicates)

---

### Story 2.3: Validación Post-Reconstrucción y Reporte Final

As an administrador de SGF,
I want the system to automatically verify that the reconstruction is complete and correct, and generate a comprehensive auditable report,
So that I have documented evidence that the rebuilt database matches the original historical data.

**Acceptance Criteria:**

**Given** the reconstruction import completed
**When** post-reconstruction validation runs
**Then** the system checks: COUNT(member) == N socios in socios.xlsx; COUNT(shift) == M cortes imported; for each imported shift, SUM(InventoryMovement.total WHERE type=SALE AND shiftId=X) ≈ Shift.totalSales with ±0.01 tolerance

**Given** the validation runs
**When** it completes
**Then** the system also checks for FK orphans: no InventoryMovement with a memberId pointing to a non-existent Member; no InventoryMovement with a shiftId pointing to a non-existent Shift; no Shift with a cashierId pointing to a non-existent User

**Given** all validation checks pass
**When** the report generates
**Then** a green "Reconstrucción válida" badge appears in the report header

**Given** COUNT(member) matches but a specific shift has a financial discrepancy > 0.01
**When** the report generates
**Then** an amber "Reconstrucción con advertencias" badge appears
**And** the specific discrepancy is listed: "FN-248: totalSales = 854.40 (archivo) vs 850.00 (calculado). Diferencia: 4.40"

**Given** the final report is complete
**Then** it includes: timestamp of the reconstruction; all per-entity import counts; all validation results with pass/fail; all warnings and errors with source file and row references

**Given** the final report is displayed
**When** the admin clicks "Exportar Reporte"
**Then** a printable text or PDF summary is generated for documentation purposes

---

## Epic 3: Administración de Usuarios y Empleados

*Fuente de verdad para esta épica: `_bmad-output/implementation-artifacts/investigations/administracion-usuarios-investigation.md` (investigación + arquitectura aprobadas). Módulo nuevo, sin relación de dependencia con Migración/Reconstrucción — solo las alimenta con datos de usuario correctos.*

### Requirements Inventory — Módulo de Usuarios

**Functional Requirements**

FR-U1: El sistema debe permitir al administrador crear cuentas de empleado (nombre, correo, teléfono opcional, rol, contraseña inicial) usando exclusivamente `auth.api.createUser()` de Better Auth — nunca escritura directa de Prisma sobre `User`/`Account` para datos de credencial.

FR-U2: El sistema debe permitir al administrador editar nombre, correo, teléfono, observaciones y rol de un empleado existente.

FR-U3: El sistema debe permitir al administrador activar o desactivar un empleado (`User.isActive`). Al desactivar, el sistema debe revocar de inmediato todas las sesiones activas de ese empleado vía `auth.api.revokeUserSessions()`.

FR-U4: El sistema debe permitir a cualquier empleado autenticado cambiar su propia contraseña mediante `authClient.changePassword()`, sin intervención del administrador.

FR-U5: El sistema debe permitir al administrador reiniciar la contraseña de cualquier empleado sin conocer la contraseña anterior, usando `auth.api.setUserPassword()`.

FR-U6: El sistema debe permitir al administrador listar, buscar (por nombre o correo) y filtrar (por rol y por estado activo/inactivo) a los empleados.

FR-U7: El sistema **no debe** ofrecer en ningún punto de la interfaz una acción de eliminación física de empleados — únicamente desactivación. Esto es consistente con las restricciones de llave foránea reales del schema (`Shift.cashierId`, `InventoryMovement.userId`, `CashWithdrawal.userId`, sin `onDelete: Cascade`).

FR-U8: `requireAuth()` (`lib/require-role.ts`) debe validar `User.isActive` en cada solicitud, además del rol — un empleado desactivado no debe conservar acceso a ninguna página aunque su sesión no haya sido revocada por otro medio.

FR-U9: La política mínima de contraseña de Better Auth (`minPasswordLength`) se eleva de 3 a 6.

FR-U10: Cualquier empleado creado por este módulo debe estar disponible de inmediato para el mapeo de cajero/vendedor de Migración (`GET /api/migracion/users`, Story 1.3) sin ningún cambio adicional a ese endpoint ni a su contrato.

**NonFunctional Requirements**

NFR-U1: Toda operación de credencial (creación, cambio o reinicio de contraseña) debe pasar exclusivamente por la API de Better Auth (`auth.api.*` / `authClient.*`) — nunca por escritura directa de Prisma sobre `User.password` (que no existe) ni sobre `Account`.

NFR-U2: `role`, `isActive`, `phone` y `notes` permanecen como campos de Prisma gestionados directamente por SGF — no se delega su gestión a mecanismos propios del plugin `admin` de Better Auth (ej. `banned`), para no duplicar la fuente de verdad que Epic 1/2 ya consultan directamente.

NFR-U3: Esta épica no introduce ningún modelo de auditoría/historial nuevo (sin tabla `UserAuditLog` ni equivalente).

NFR-U4: Toda ruta de administración de usuarios sigue el mismo patrón ADMIN-only (sesión + `role === "ADMIN"`) ya usado en las 9 historias de Epic 1/2. La ruta de cambio de contraseña propio requiere únicamente una sesión válida (cualquier rol), no `requireAdmin()`.

NFR-U5: `modules/users/` sigue la misma estructura y principios (P-2, P-3, P-4, P-6 de `CLAUDE.md`) que `modules/migration/` — un servicio por caso de uso, dominio puro sin Prisma/Better Auth, contratos explícitos, misma disposición de carpetas.

### Architectural Decisions

**AD-U1 — Better Auth como única fuente de autenticación, nunca reimplementada.** Toda creación/cambio/reinicio de contraseña pasa por `auth.api.createUser()`, `authClient.changePassword()`, o `auth.api.setUserPassword()` del plugin `admin` (ya instalado en `better-auth@1.4.12`, solo falta habilitarlo en `lib/auth.ts`). Ninguna ruta ni componente escribe `Account.password` directamente.

**AD-U2 — `role`/`isActive`/`phone`/`notes` siguen siendo campos de `User` gestionados por Prisma, no por el plugin `admin`.** Evita que este módulo diverja del patrón que Epic 1/2 ya usan para leer estos mismos campos.

**AD-U3 — Eliminación física nunca se expone en la UI.** Reforzado también por FK reales de Postgres (mismo patrón que H2 de Story 2.3 de Migración) — decisión de producto explícita, no dependiente únicamente de que la base de datos rechace el `DELETE`.

### FR Coverage Map

| FR | Historia |
|----|----------|
| FR-U1 | Story 3.3 |
| FR-U2 | Story 3.3 |
| FR-U3 | Story 3.4 |
| FR-U4 | Story 3.5 |
| FR-U5 | Story 3.5 |
| FR-U6 | Story 3.2 |
| FR-U7 | Story 3.1, 3.3, 3.4 |
| FR-U8 | Story 3.1 |
| FR-U9 | Story 3.1 |
| FR-U10 | Story 3.1 (verificación de compatibilidad, sin cambios al endpoint) |

*NFR-U1–U5 aplican a todas las historias de esta épica.*

### Orden recomendado de implementación (ajustado respecto a la propuesta inicial)

La propuesta inicial ordenaba "Listado" (3.5) después de "Alta y edición" (3.2) y "Activar/desactivar" (3.3). **Se invierte ese orden**: el listado (tabla + Manager) es el contenedor donde las acciones de crear, editar, activar/desactivar y resetear contraseña se anclan (mismo patrón que `SociosManager`/`MigracionManager` — un Manager dueño del estado, con modales que se abren desde filas de una tabla). Construir "Alta y edición" antes que el listado obligaría a una pantalla temporal sin tabla, para luego descartarla — trabajo desechable. El orden de historias (3.1–3.5) se mantiene como identificador, pero **3.2 pasa a ser el listado** y **la creación/edición se mueve a 3.3**, manteniendo el total de 5 historias que el usuario pidió.

1. **Story 3.1 — Habilitar Better Auth Admin Plugin e infraestructura del módulo.** Prerequisito técnico: habilita el plugin `admin`, sube `minPasswordLength` a 6, agrega `phone`/`notes` a `User` (migración de Prisma aditiva), valida `isActive` en `requireAuth()`, y reemplaza `services/users.service.ts` (código muerto y roto) por `modules/users/users.service.ts`. Sin UI propia — mismo rol que tuvo Story 1.1 en Epic 1.
2. **Story 3.2 — Listado, búsqueda y filtro de empleados.** Pantalla principal (`/usuarios`), tabla + búsqueda + filtro por rol/estado. Es el contenedor donde 3.3–3.5 anclan sus acciones.
3. **Story 3.3 — Alta y edición de empleados.** Modal de creación (usa `auth.api.createUser()`) y edición, alojado en el Manager de 3.2.
4. **Story 3.4 — Activación y desactivación de empleados.** Toggle de estado + revocación de sesiones, acción por fila en la tabla de 3.2.
5. **Story 3.5 — Gestión de contraseñas (administrador y autoservicio).** Reinicio por admin (acción por fila en 3.2) + pantalla "Mi Cuenta" para autoservicio, accesible a cualquier empleado autenticado.

### Story 3.1: Habilitar Better Auth Admin Plugin e Infraestructura del Módulo

As an administrador de SGF,
I want que el sistema tenga habilitada la infraestructura de autenticación administrativa y los campos de empleado necesarios,
So that las historias siguientes de este módulo puedan construirse sin volver a tocar configuración base.

**Acceptance Criteria:**

**Given** el plugin `admin` de Better Auth se agrega a `lib/auth.ts`
**When** el servidor arranca
**Then** `auth.api.createUser`, `auth.api.setUserPassword`, y `auth.api.revokeUserSessions` quedan disponibles sin errores — `auth.api.setRole` queda explícitamente fuera de esta verificación (AD-U2: el rol se gestiona vía Prisma directo, no vía el plugin; ver hallazgo H3 en Story 3.1)

**Given** el schema de Prisma se actualiza
**When** se ejecuta la migración
**Then** `User` gana los campos `phone String?` y `notes String?`, ambos opcionales — sin afectar ningún registro existente

**Given** `minPasswordLength` se actualiza a 6
**When** un usuario existente con contraseña más corta (ej. "123") intenta iniciar sesión
**Then** el login sigue funcionando con la contraseña actual — la política solo aplica al establecer una contraseña nueva

**Given** `requireAuth()` se extiende para validar `isActive`
**When** un usuario con `isActive = false` presenta una sesión válida
**Then** es redirigido a `/login` igual que si no tuviera sesión

**Given** `services/users.service.ts` (código muerto, sin consumidores, con `createUser()` roto — ver investigación) existe
**When** se crea `modules/users/users.service.ts`
**Then** el archivo legacy se elimina por completo — no queda código muerto ni una segunda implementación del mismo caso de uso (P-8)

**Given** `GET /api/migracion/users` (Story 1.3) ya existe
**When** se completa esta historia
**Then** ese endpoint sigue funcionando sin ningún cambio — se verifica manualmente que el mapeo de empleados de Migración no se rompe

---

### Story 3.2: Listado, Búsqueda y Filtro de Empleados

As an administrador de SGF,
I want ver una lista de todos los empleados con búsqueda y filtros,
So that pueda encontrar rápidamente a un empleado para gestionarlo.

**Acceptance Criteria:**

**Given** el admin navega a la sección Usuarios (`/usuarios`, nivel superior — `app/(dashboard)/configuracion/` no tiene página propia hoy, ver Story 3.2 hallazgo H1)
**When** la página carga
**Then** ve una tabla con nombre, correo, rol, estado (activo/inactivo) de todos los empleados
**And** un usuario no-ADMIN es redirigido antes de que la página renderice

**Given** la lista de empleados se muestra
**When** el admin escribe en el campo de búsqueda
**Then** la lista se filtra por coincidencia parcial de nombre o correo

**Given** la lista de empleados se muestra
**When** el admin selecciona un filtro de rol o de estado
**Then** la lista se reduce a los empleados que cumplen ese filtro

**Given** la tabla de empleados se renderiza
**When** el admin ve cada fila
**Then** existen puntos de anclaje visibles para las acciones de historias siguientes (editar, activar/desactivar, reiniciar contraseña) — aunque esta historia no implementa esas acciones todavía

---

### Story 3.3: Alta y Edición de Empleados

As an administrador de SGF,
I want crear nuevos empleados y editar los datos de los existentes,
So that el catálogo de usuarios de SGF refleje correctamente al personal actual.

**Acceptance Criteria:**

**Given** el admin hace clic en "Nuevo Empleado" desde el listado (Story 3.2)
**When** completa nombre, correo, teléfono (opcional), rol, y contraseña inicial, y confirma
**Then** el sistema llama `auth.api.createUser()`, fija `role`/`isActive=true` en la misma operación, y el nuevo empleado aparece en el listado sin recargar la página

**Given** el correo ingresado ya está registrado
**When** el admin intenta crear el empleado
**Then** el sistema rechaza la operación con un mensaje claro, sin crear ningún registro parcial

**Given** el admin hace clic en "Editar" sobre un empleado existente
**When** modifica nombre, correo, teléfono, observaciones, o rol, y confirma
**Then** los cambios se guardan vía Prisma directo (no son datos de credencial) y se reflejan de inmediato en el listado

**Given** el admin cambia el correo de un empleado a uno ya usado por otro
**When** confirma la edición
**Then** el sistema rechaza el cambio con un mensaje claro, sin modificar el registro

---

### Story 3.4: Activación y Desactivación de Empleados

As an administrador de SGF,
I want activar o desactivar la cuenta de un empleado,
So that pueda revocar el acceso de alguien que ya no debe usar el sistema, sin borrar su historial.

**Acceptance Criteria:**

**Given** un empleado activo tiene una sesión iniciada
**When** el admin lo desactiva desde el listado
**Then** `User.isActive` pasa a `false`, y `auth.api.revokeUserSessions()` revoca de inmediato todas sus sesiones activas — el empleado pierde acceso sin esperar a que su sesión expire por sí sola

**Given** un empleado desactivado
**When** intenta iniciar sesión de nuevo
**Then** el sistema lo rechaza

**Given** un empleado desactivado
**When** el admin lo reactiva
**Then** `User.isActive` vuelve a `true` y puede iniciar sesión normalmente en su siguiente intento

**Given** un empleado con turnos, movimientos de inventario, o retiros de caja históricos asociados
**When** se desactiva
**Then** todo su historial permanece intacto y visible en reportes/cortes — desactivar nunca oculta ni modifica datos históricos

**Given** cualquier empleado, activo o no
**When** el admin busca una acción de "Eliminar" en la interfaz
**Then** esa acción no existe — solo "Desactivar"/"Activar" están disponibles (FR-U7)

---

### Story 3.5: Gestión de Contraseñas (Administrador y Autoservicio)

As an administrador de SGF o como empleado,
I want que el administrador pueda reiniciar la contraseña de cualquier empleado, y que cada empleado pueda cambiar la suya propia,
So that el acceso se mantenga seguro sin depender de que el administrador conozca contraseñas ajenas.

**Acceptance Criteria:**

**Given** el admin selecciona "Reiniciar contraseña" sobre un empleado desde el listado
**When** ingresa una nueva contraseña (mínimo 6 caracteres, FR-U9) y confirma
**Then** el sistema llama `auth.api.setUserPassword()` — sin necesidad de conocer la contraseña anterior del empleado

**Given** el admin ingresa una contraseña de menos de 6 caracteres al reiniciar
**When** confirma
**Then** el sistema rechaza la operación con un mensaje claro, sin cambiar la contraseña actual

**Given** cualquier empleado autenticado (ADMIN o EMPLEADO) navega a "Mi Cuenta"
**When** ingresa su contraseña actual y una nueva contraseña válida, y confirma
**Then** el sistema llama `authClient.changePassword()` — sin pasar por ninguna ruta ADMIN-only

**Given** un empleado ingresa una contraseña actual incorrecta en "Mi Cuenta"
**When** intenta cambiarla
**Then** el sistema rechaza la operación con un mensaje claro
