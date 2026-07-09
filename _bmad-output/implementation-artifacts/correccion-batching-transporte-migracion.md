# Story: Batching de Transporte HTTP para Importación de Lotes Grandes en Migración

**Status:** done
**Epic:** Corrección ad-hoc — Transporte HTTP del Wizard de Migración (fuera de la numeración de Epic 1/2). Originada en `_bmad-output/implementation-artifacts/investigations/http-413-migracion-upload-investigation.md`.
**Prioridad:** Alta — bloquea el uso real del wizard con el lote histórico completo (243 `.xlsx`) en el entorno de despliegue real.
**Implementado y revisado.** Todas las Tasks (T1–T14) completas. Code review encontró 3 hallazgos High en el staging persistente (aislamiento por `kind`, completitud pre-`finalize`, doble ejecución concurrente) — los tres corregidos en la misma pasada de revisión y re-validados. Aprobada.

---

## Story

Como administrador que usa el wizard de Migración (`/configuracion/migracion`) para importar el lote histórico real (243 `.xlsx`, ~5.29 MB de payload multipart),
quiero que el wizard transporte ese lote al servidor en múltiples requests HTTP más pequeñas en vez de una sola,
para que la importación no falle con `HTTP 413` en el entorno de despliegue real, sin que el usuario perciba múltiples migraciones ni tenga que repetir mapeo de empleados o confirmaciones por cada request.

---

## Contexto del desarrollador

### Hallazgo base (heredado de la investigación, no reabrir)

`http-413-migracion-upload-investigation.md` — Confirmado: `FileUploadStep.handleAnalyze()` (`FileUploadStep.tsx:56-62`) manda los 243 archivos en un único `FormData`/`fetch`. Deducido (Media-Alta, no reabrir el debate de causa): el 413 real ocurre en la capa de plataforma de despliegue (Vercel), antes de llegar al código de SGF — el código de SGF no tiene ningún camino que emita `413` (`validate/route.ts` solo valida tamaño POR ARCHIVO, 10 MB, nunca el total).

### Mapa real del transporte de archivos en el wizard — 5 puntos, no 1

La inspección de esta Story (código real, no la investigación previa que solo auditó `FileUploadStep`) encontró que **el lote completo de archivos se retransporta 5 veces**, en ambos modos:

| # | Componente | Endpoint | Modo | Archivos enviados | Server-side |
|---|---|---|---|---|---|
| 1 | `FileUploadStep.tsx:56-62` | `POST /api/migracion/validate` | Sync + Reconstruction (componente compartido) | TODOS | `MigrationService.analyzeFiles()` — por archivo, independiente |
| 2 | `PreviewStep.tsx:23-29` | `POST /api/migracion/preview` | Sync + Reconstruction (componente compartido) | TODOS (`files` prop = `analysisFiles`/`files` del wizard) | `MigrationService.previewFiles()` |
| 3 | `ImportSociosStep.tsx:25-29` | `POST /api/migracion/sync-members` | Sync | TODOS (incluye cortes, aunque solo se usa el archivo de socios) | re-ejecuta `previewFiles()` completo, luego `syncMembers()` |
| 4 | `ImportCortesStep.tsx:26-31` | `POST /api/migracion/sync-shifts` | Sync | TODOS + `employeeMapping` | re-ejecuta `previewFiles()` completo, luego `syncShifts()` + `finalizeSyncMode()` |
| 5 | `ExecutionStep.tsx:34-40` | `POST /api/migracion/reconstruccion/ejecutar` | Reconstruction | TODOS + `employeeMapping` + `reimportProducts` | re-ejecuta `previewFiles()` completo, luego `executeReconstruction()` |

`MigracionManager.tsx:30-41` guarda `analysisFiles: File[]` (los `File` del navegador, no los bytes parseados) y los reenvía intactos a cada paso posterior — confirmado en `MigracionManager.tsx:172,186,194` y en `ReconstructionManager.tsx:34,81,102`. **Los 5 puntos son candidatos reales al mismo 413**, no solo el primero — el requisito del pedido ("cubrir TODAS las requests que transporten el lote completo") aplica literalmente a los 5.

### Por qué los puntos 3, 4 y 5 no se resuelven solo con batching de transporte

`syncShifts()` (`migration.service.ts:186-369`) y `finalizeSyncMode()` (`migration.service.ts:381-432`) — **sin tocar, lógica de negocio intacta** — están diseñados para recibir el arreglo COMPLETO de `DomainShift[]` en una sola llamada:

- `finalizeSyncMode()` calcula `findMostRecentShift()` y `computeMaxTicket()` (`sync-finalize.ts:13-31`) sobre el conjunto GLOBAL de shifts exitosos — si se llamara una vez por batch, cada llamada vería solo un subconjunto y el "corte más reciente" o el "ticket máximo" calculado en batches intermedios sería incorrecto (no es una validación resumible por suma, es un máximo/mínimo global que requiere ver todo el conjunto a la vez).
- `buildGymStockUpdates()` (`sync-finalize.ts:40-42`) actualiza `Product.gymStock` con la snapshot del corte más reciente — llamarlo por batch pisaría el stock con datos parciales, no con el estado final real.
- El pedido prohíbe explícitamente inventar persistencia server-side entre requests (no hay mecanismo para "recordar" shifts de un batch anterior en el servidor sin agregar estado).

Por lo tanto: **batching de transporte por archivos crudos NO es viable para los puntos 3, 4 y 5** sin romper `finalizeSyncMode()`/`executeReconstruction()`. La única forma de preservar la llamada única a estas funciones de negocio, sin tocarlas y sin persistencia server-side nueva, es que el WIZARD acumule del lado del cliente los datos YA PARSEADOS (no los archivos crudos) durante los batches de análisis/preview, y envíe esos datos parseados (JSON, no `multipart/form-data` de Excel) en una única request final por paso de ejecución. Esto es exactamente la opción que el pedido anticipa en el punto 4 ("mover una comprobación pura al cliente/dominio compartido si técnicamente es seguro") — aquí se extiende a "mover el DATO ya parseado", no solo una comprobación.

### Por qué esto es viable sin tocar lógica de negocio

`syncMembers(members: DomainMember[])`, `syncShifts(shifts, employeeMapping)`, `executeReconstruction(members, shifts, employeeMapping, reimportProducts)` (`migration.service.ts:117,186,`; `reconstruction.service.ts`) ya reciben `DomainMember[]`/`DomainShift[]` como parámetros — NO reciben `files` directamente. Hoy, los 3 endpoints (`sync-members`, `sync-shifts`, `ejecutar`) hacen `previewFiles(files)` **de nuevo** (tercera vez que se parsean los mismos archivos: preview, sync-members, sync-shifts/ejecutar) solo para reconstruir ese `DomainMember[]`/`DomainShift[]` a partir de los archivos crudos. Si el cliente ya tiene esos datos parseados (acumulados durante el batching de `/preview`), la ruta puede recibirlos directamente en el body JSON y pasarlos tal cual a la función de negocio sin cambiar una sola línea de `syncMembers`/`syncShifts`/`finalizeSyncMode`/`executeReconstruction`.

`DomainMember`/`DomainShift` (`domain.types.ts:85-160`) son 100% serializables a JSON (solo `string`, `number`, `boolean`, `Date | null` — sin `Decimal` ni tipos Prisma). El patrón de serialización de fechas (`.toISOString()`) YA existe en `preview/route.ts:8-24` (`serializeMember`) — mismo patrón, solo que `serializeShift` (`preview/route.ts:26-42`) hoy DESCARTA `sales`, `inventory`, `withdrawals` y los campos financieros del Cierre, dejando solo conteos para la UI. `MemberPreviewSchema` (`types/api/migracion.ts:33-47`), en cambio, YA es un espejo 1:1 sin pérdida de `DomainMember` — los socios no necesitan ningún cambio de contrato, solo los cortes.

### Medición real de los payloads JSON propuestos — riesgo materializado, diseño corregido

**Método:** script de solo lectura/cómputo local (sin DB, sin HTTP, sin subagentes) que replica exactamente la lógica de `previewFiles()` (`migration.service.ts:54-106`) usando únicamente los adapters/transformers puros (`xlsxSociosAdapter`, `xlsxCortesAdapter`, `transformMembers`, `transformShift`) sobre los 243 `.xlsx` reales de `docs/2026/`, construye los 3 payloads exactos que esta Story proponía enviar, y mide `Buffer.byteLength(JSON.stringify(payload), "utf8")`. `employeeMapping` se construyó con los 8 `sellerNames` reales detectados, mapeados a un UUID placeholder de 36 caracteres (longitud real de un UUID de better-auth) — no se leyó ni escribió ningún usuario real de la DB.

| Payload propuesto | Bytes reales | MiB | % de `MAX_BATCH_BYTES` (1.5 MB) | % del límite deducido de plataforma (~4.5 MB, sigue Deducido/Media-Alta, no Confirmado) |
|---|---|---|---|---|
| `POST /api/migracion/sync-members` (`{ members }`) | 259,056 B | 0.2471 MiB | 16.5% | 5.5% |
| `POST /api/migracion/sync-shifts` (`{ shifts, employeeMapping }`) | 1,896,939 B | 1.8091 MiB | **120.6%** | 40.2% |
| `POST /api/migracion/reconstruccion/ejecutar` (`{ members, shifts, employeeMapping, reimportProducts }`) | 2,156,019 B | 2.0561 MiB | **137.1%** | 45.7% |

**Decisión, siguiendo la regla explícita del pedido ("si CUALQUIER JSON global supera 1.5 MB, NO conservar el diseño de una sola request"):**

- **`sync-members` queda como diseñado** (T11 — una sola request JSON, sin staging) — 259,056 B está claramente por debajo de 1.5 MB (16.5%), una sola request JSON es segura y no requiere ningún mecanismo adicional.
- **`sync-shifts` y `ejecutar` NO conservan el diseño de "JSON global en una sola request"** — ambos superan el cap (120.6% y 137.1%). El componente que domina el tamaño en ambos es el arreglo `shifts` (el de `ejecutar` es prácticamente idéntico: `2,156,019 − 259,056 ≈ 1,896,963 B`, coincide con el de `sync-shifts` — `members`/`employeeMapping`/`reimportProducts` son marginales). El diseño se corrige exactamente para la porción `shifts`: ver "Mecanismo corregido" más abajo. Nota: ambos quedan igualmente por debajo del límite DEDUCIDO de plataforma (40.2%/45.7% de ~4.5 MB) — pero esta Story sigue la regla de decisión explícita del pedido (el cap propio de 1.5 MB, no el límite deducido de terceros) para no depender de un número no confirmado al 100%.

### Mecanismo corregido para `sync-shifts` y `ejecutar` — staging temporal por `importId`

Se evaluó primero (por instrucción explícita) si las rutas de ejecución pueden recibir `shifts` en sub-batches y acumularlos temporalmente antes de una ejecución final única. Es la única opción viable que preserva `syncShifts()`/`finalizeSyncMode()`/`executeReconstruction()` sin tocarlos (ver Contexto §"Por qué los puntos 3, 4 y 5..." — necesitan el conjunto GLOBAL de shifts en una sola llamada) — pero **requiere estado server-side nuevo**, porque el destino de despliegue real es Vercel Serverless Functions (confirmado en la investigación previa, `next.config.ts`), donde NO hay garantía de que dos requests HTTP sucesivas del mismo `importId` lleguen a la misma instancia de proceso — un `Map` en memoria del servidor NO sirve como mecanismo de acumulación entre requests en ese entorno. La única acumulación confiable entre requests en Vercel es un almacén compartido — en este proyecto, eso es Postgres vía Prisma (ya es la única infraestructura de estado compartido existente).

**Diseño:** nueva tabla Prisma **temporal** (no permanente — con expiración y limpieza explícitas, ver abajo), usada ÚNICAMENTE como buffer de tránsito para la porción `shifts` (la única que excede el cap; `members`/`employeeMapping`/`reimportProducts` viajan en la request de finalize porque juntos son pequeños, ver medición arriba):

```prisma
model MigrationImportStaging {
  id          String   @id @default(cuid())
  importId    String   // UUID generado por el cliente una vez por importación lógica
  adminUserId String   // dueño — aislamiento entre ADMINs/importaciones
  kind        String   // "sync-shifts" | "reconstruccion-ejecutar"
  batchIndex  Int      // orden de sub-batch — permite reintento idempotente
  shiftsJson  Json     // slice de DomainShift[] de este sub-batch (fechas como ISO string)
  createdAt   DateTime @default(now())

  @@unique([importId, batchIndex])
  @@index([importId])
  @@index([createdAt])
}
```

**Flujo (`sync-shifts`, análogo para `ejecutar` con `kind: "reconstruccion-ejecutar"`):**

1. El cliente genera `importId = crypto.randomUUID()` una sola vez al entrar a `ImportCortesStep`/`ExecutionStep`.
2. El cliente particiona el arreglo `shifts` YA consolidado (no archivos — el mismo dato de dominio, generalizando la función pura de T1 para partir por tamaño serializado de cada `shift` en vez de tamaño de archivo) en sub-batches bajo `MAX_BATCH_BYTES` (mismo cap de 1.5 MB, mismo mecanismo, reutilizado — no uno nuevo).
3. Cada sub-batch se envía a `POST /api/migracion/sync-shifts/stage` (ruta nueva) con `{ importId, batchIndex, shifts: <slice> }`. El handler hace `upsert` sobre `(importId, batchIndex)` — reenviar el mismo `batchIndex` (reintento) SOBRESCRIBE, nunca duplica.
4. Al completar todos los sub-batches, el cliente llama `POST /api/migracion/sync-shifts/finalize` con `{ importId, employeeMapping }` (pequeño). El handler: valida sesión ADMIN activa, carga TODAS las filas `MigrationImportStaging` con ese `importId` **Y** `adminUserId` igual al de la sesión actual (aislamiento — un `importId` de otro admin nunca es visible), ordena por `batchIndex`, concatena los slices en el arreglo `DomainShift[]` completo (orden determinístico), **rehidrata las fechas** (ver siguiente sección), llama `syncShifts(allShifts, employeeMapping)` + `finalizeSyncMode(allShifts, result)` EXACTAMENTE UNA VEZ (sin cambios en ninguna de las dos funciones), y por último borra las filas de staging de ese `importId` (limpieza en el camino feliz).
5. **Expiración/abandono:** si el admin cierra la pestaña a medio import y nunca llama `finalize`, las filas de staging de ese `importId` quedan huérfanas. Mitigación sin infraestructura nueva de cron: barrido perezoso — cada `INSERT`/`upsert` de staging borra primero cualquier fila de `MigrationImportStaging` con `createdAt` de más de 2 horas de antigüedad (cualquier `importId`), antes de insertar la nueva. Acotado, autolimpiante, sin job runner nuevo. No hay endpoint de "cancelar import" explícito en esta Story (fuera de alcance — el barrido por TTL es suficiente para el riesgo real: filas JSON pequeñas, sin bloqueo de recursos críticos).
6. **Aislamiento:** `importId` es un UUID v4 generado por el cliente (espacio de colisión despreciable) + verificación de `adminUserId` de sesión en cada operación de staging/finalize — incluso en el caso improbable de colisión de `importId`, el filtro por `adminUserId` bloquea acceso cruzado.
7. **Reintento:** idempotente por diseño — reenviar un `batchIndex` ya almacenado sobrescribe (mismo contenido esperado, ya que el cliente no cambia los datos entre reintentos), nunca duplica ni acumula shifts repetidos en el arreglo final.
8. **Qué pasa si el proceso se abandona:** ver punto 5 — huérfano acotado, barrido por TTL en el siguiente `INSERT` de staging de CUALQUIER admin. No requiere intervención manual. Costo: hasta 2 horas de filas JSON pequeñas sin limpiar en el peor caso — aceptable, no es dato de negocio ni bloquea otras operaciones del sistema.

**Por qué esto SÍ es "no inventar persistencia permanente":** la tabla es exclusivamente un buffer de tránsito — nunca se lee fuera del propio flujo de `finalize`, se borra en el camino feliz, y se autolimpia por TTL en el camino de abandono. No es un registro de negocio, no aparece en ningún reporte, no se consulta desde ningún otro contexto del sistema.

### Rehidratación de `Date` — confirmado con evidencia real, no asumir que JSON preserva `Date`

El mismo script de medición confirmó con un round-trip real (`JSON.parse(JSON.stringify(shift))` sobre un shift real del lote): `openingDate` es `Date` ANTES de serializar, pero **string** (`"2026-01-30T07:00:00.000Z"`, `typeof === "string"`) DESPUÉS de `JSON.parse` — `JSON.stringify` invoca `Date.prototype.toJSON()` automáticamente (por eso el envío por HTTP funciona sin código extra del lado del cliente), pero `JSON.parse` NUNCA revive strings a `Date` — eso requiere código explícito del lado del servidor. Mismo comportamiento confirmado en `sale.saleDate`.

**Campos que requieren rehidratación explícita ANTES de llamar a las funciones de negocio (server-side, en los handlers de `finalize`/`sync-members`/`ejecutar`, NUNCA dentro de `syncMembers`/`syncShifts`/`finalizeSyncMode`/`executeReconstruction` — esas funciones siguen esperando `Date` real, tal como hoy, no se tocan):**
- `DomainMember`: `birthDate`, `startDate`, `endDate`, `lastVisit` (todos `Date | null`, `domain.types.ts:90-97`).
- `DomainShift`: `openingDate` (línea 134).
- `DomainSale` (dentro de `shift.sales[]`): `saleDate` (línea 103).
- `DomainWithdrawal` (dentro de `shift.withdrawals[]`): `withdrawalDate` (línea 127).

Patrón de rehidratación: `field === null ? null : new Date(field)` por cada uno de los campos anteriores, aplicado después de `request.json()` (o de reconstruir el arreglo desde `MigrationImportStaging`) y antes de invocar la función de negocio correspondiente. No se encontró ningún otro tipo no serializable (`File`, `Buffer`, `Map`, `Set`, instancias de clase con métodos) en `DomainMember`/`DomainShift`/`DomainSale`/`DomainInventoryRow`/`DomainWithdrawal` — confirmado por inspección directa de `domain.types.ts:85-160`, todos los campos son `string | number | boolean | Date | null`.

### Ausencia total de validación de folios duplicados — contradicción técnica encontrada

Se buscó en todo el módulo (`grep -rn "duplicad"` sobre `modules/migration`, `app/api/migracion`, componentes del wizard) cualquier chequeo de folio duplicado entre archivos de corte: **no existe ninguno, ni hoy en el request monolítico único.** `previewFiles()` (`migration.service.ts:54-106`) simplemente hace `allShifts.push(result.data)` por cada archivo de corte reconocido, sin verificar unicidad de `folio` contra los demás. Si dos de los 243 archivos reales tuvieran el mismo folio detectado, ambos aparecerían hoy en `allShifts` sin ninguna advertencia — el pedido asume "0 folios duplicados" como un invariante ya validado, pero en el código real es simplemente una propiedad *observada* del lote real, no una propiedad *verificada* por ningún código.

**Consecuencia para el diseño:** concatenar `shifts` de N batches preserva EXACTAMENTE la misma semántica (ausencia de chequeo) que el request monolítico de hoy — no hay pérdida de validación al batchear, porque no hay validación que perder. Pero el AC de este Story exige *verificar* "0 folios duplicados" contra el lote real, lo cual requiere que el chequeo EXISTA. Se diseña como una función pura nueva en la consolidación (ver T2), aplicada sobre el conjunto YA consolidado (global, no por-batch) — así es correcta sin importar cuántos batches se usen, y no depende de moverla al servidor. No se toca `previewFiles()` ni ningún parser.

---

## Decisiones de diseño

### 1–2. Unidad de batching y límite preventivo

Partición por **bytes acumulados como criterio primario**, con un tope de cantidad de archivos como salvaguarda secundaria (nunca al revés) — resistente a lotes con archivos de tamaño variable, sin asumir que todos pesan ~22 KB como el lote real actual (`docs/2026`: mínimo observado 20,370 B, máximo 94,554 B, promedio ~22.66 KB sobre 243 archivos).

```ts
// modules/migration/domain/upload-batching.ts (nuevo, puro — sin Prisma/HTTP/exceljs)
export const MAX_BATCH_BYTES = 1.5 * 1024 * 1024; // 1,572,864 B — preventivo de CLIENTE
export const MAX_BATCH_FILES = 80;                 // salvaguarda secundaria, no el driver principal
```

**Justificación del límite:** la causa deducida del 413 real es el límite histórico de Vercel Serverless Functions Node.js (~4.5 MB). `1.5 MB` deja ~3x de margen bajo ese umbral deducido — suficiente para absorber el overhead real de boundaries multipart (~170 B/archivo observado en la reproducción con el lote real) y crecimiento futuro del lote histórico sin acercarse al límite de plataforma. Con el lote real (243 archivos, 5,507,265 B), este límite produce ~4 batches (`ceil(5,507,265 / 1,572,864)`), suficiente para ejercitar el batching y el progreso UI de forma significativa sin sobre-optimizar.

**Explícito:** este límite es preventivo de CLIENTE únicamente. No reemplaza ni modifica la validación server-side existente por archivo (`MAX_FILE_SIZE = 10 * 1024 * 1024` en `validate/route.ts:6` y `preview/route.ts:6`, sin cambios).

**Caso borde documentado, no resuelto con chunking real:** si un único archivo (dentro del límite de 10 MB por archivo) excede por sí solo `MAX_BATCH_BYTES`, ese archivo viaja solo en su propio batch — la partición nunca combina archivos que excedan el presupuesto, pero tampoco divide un archivo individual (fuera de alcance: chunking de bytes dentro de un archivo, no pedido y no justificado por el lote real, donde el archivo más grande observado es de 94,554 B).

```ts
export function partitionFilesByBudget(
  files: { size: number }[],
  opts: { maxBytes: number; maxFiles: number } = { maxBytes: MAX_BATCH_BYTES, maxFiles: MAX_BATCH_FILES },
): number[][] // arrays de índices, preserva orden original
```

Algoritmo: greedy, un solo recorrido, preserva el orden de entrada — agrega el archivo actual al batch en curso salvo que exceder `maxBytes` O `maxFiles` obligue a cerrar el batch y abrir uno nuevo (un archivo solo jamás se descarta ni se re-ordena).

### 3. Semántica de una sola importación

El batching es invisible fuera de `FileUploadStep`/`PreviewStep`/`ImportSociosStep`/`ImportCortesStep`/`ExecutionStep`. `MigracionManager`/`ReconstructionManager` NO cambian su máquina de estados (`step: 1|2|3|4|5|6` / `1..7`) ni el número de pasos visibles — cada paso sigue disparando UNA sola vez `onAnalysisComplete`/`onPreviewComplete`/`onComplete` con el resultado YA consolidado, exactamente como hoy. `InconsistencyStep` no cambia (ya opera 100% sobre `previewResult.sellerNames`/`previewResult.warnings`, sin archivos — confirmado en `InconsistencyStep.tsx:30`).

### 4. Consolidación de resultados

**`/validate` (`AnalysisResultType[]`):** concatenación simple preservando orden — hoy ya es un arreglo plano por archivo sin ningún cómputo cruzado; no hay semántica que preservar más allá del orden.

**`/preview` (dataset consolidado):** por campo:
- `members`: concatenación (cada socio proviene de un único archivo; sin dedup hoy, no se agrega ninguno).
- `shifts`: concatenación + **nuevo** `detectDuplicateFolios(shifts): ParseWarningType[]` aplicado sobre el arreglo YA consolidado (global) — agrega entradas a `warnings` con `code: "DUPLICATE_FOLIO"` si aparecen folios repetidos. Pura, en `modules/migration/domain/upload-batching.ts` o archivo hermano puro.
- `warnings`: concatenación + las entradas de `detectDuplicateFolios`.
- `membershipTypeDistribution` (`Record<string, number>`): suma por clave entre batches (`mergeDistributions`).
- `sellerNames`: unión + `Set` + `.sort()` sobre TODOS los batches (replica exactamente la lógica ya usada dentro de `previewFiles()` en `migration.service.ts:90-97`, pero a nivel de consolidación de batches en vez de a nivel de archivos).
- `totalWarnings`: `warnings.length` recalculado DESPUÉS de concatenar (no se suma el campo `totalWarnings` de cada batch, para no arrastrar un valor ya obsoleto antes de agregar los folios duplicados).

### 5. Todas las requests que deben cambiar

Las 5 de la tabla del Contexto. Puntos 1–2 (`validate`, `preview`): mismo contrato de servidor, el cliente los llama N veces con subconjuntos de archivos y consolida. Punto 3 (`sync-members`): cambia el contrato de ENTRADA de `multipart/form-data` con `files` a UNA sola request JSON con `DomainMember[]` ya parseados (medido: 259,056 B, seguro). Puntos 4–5 (`sync-shifts`, `ejecutar`): medidos por encima del cap (ver "Medición real..." en Contexto) — cambian a un flujo de 2 rutas: `POST .../stage` (N sub-batches de `shifts`, JSON, acumulados en `MigrationImportStaging`) + `POST .../finalize` (una sola vez, `{importId, employeeMapping}` o `{importId, members, employeeMapping, reimportProducts}`, que reconstruye el arreglo completo, rehidrata fechas, y llama a la función de negocio una sola vez) — sin tocar `syncMembers`/`syncShifts`/`finalizeSyncMode`/`executeReconstruction` (ver Contexto §"Mecanismo corregido").

### 6. Fallos parciales

- Si un batch de `/validate` o `/preview` falla (red/HTTP no-2xx): detener inmediatamente el envío de batches subsecuentes, NO avanzar de paso, mostrar el error identificando qué batch falló (ej. "Error en lote 3 de 4"), ofrecer un botón "Reintentar" que reintenta ÚNICAMENTE el batch fallido (los batches ya exitosos no se re-envían — son idempotentes de lectura, pero re-enviarlos es trabajo innecesario, no incorrecto).
- Justificación de "reintentar solo el batch fallido" y no reiniciar todo el análisis: `/validate` y `/preview` son ambos de solo lectura (sin escritura DB) — no hay riesgo de duplicar efectos; reintentar solo el batch fallido es estrictamente más simple para el usuario y no tiene contraindicación.
- No se persiste ningún estado de reintento en el servidor (no existe hoy, no se agrega).
- Para `sync-members`/`sync-shifts`/`ejecutar` (ahora una sola request JSON, no batcheada): el manejo de error de estos pasos NO cambia respecto a hoy — siguen siendo una sola request, un solo punto de fallo, mismo `try/catch` que ya tienen (`ImportSociosStep.tsx:28-40`, etc.).

### 7. Progreso UI

Mínimo: contador "Lote X de N" (o "archivo X de N procesados") visible durante `handleAnalyze()` (`FileUploadStep`) y durante `fetchPreview()` (`PreviewStep`) mientras se envían los batches secuenciales — reemplaza/complementa el `Loader2` genérico ya existente en ambos componentes. No se rediseña el wizard ni sus pasos.

### 8. Orden y determinismo

Batches **secuenciales** (`await` uno tras otro, no `Promise.all`) — el código real no da ninguna razón para paralelizar (ninguna de las rutas depende de throughput, y paralelizar N requests de igual tamaño hacia el mismo endpoint no ofrece ventaja demostrable aquí, solo más superficie de fallos concurrentes). El orden de partición preserva el orden de `selectedFiles`/`analysisFiles` tal como lo arma el usuario al seleccionar/soltar archivos — la consolidación concatena en ese mismo orden, determinística independientemente de latencia de red (no hay carrera: es secuencial).

### 9. Compatibilidad

- Upload de uno o pocos archivos: con 1 archivo, `partitionFilesByBudget` devuelve un solo batch — cero requests adicionales, comportamiento idéntico a hoy.
- Ambos modos (Sync/Reconstruction): `FileUploadStep`/`PreviewStep` son compartidos — el fix de batching en ellos cubre automáticamente ambos modos (confirmado: `ReconstructionManager.tsx:79,81` reutiliza los mismos componentes).
- Exclusión de `.xls`: sin cambios (`FileUploadStep.tsx:22-24`, filtro por `.endsWith(".xlsx")`, no se toca).
- Límite de 10 MB por archivo: sin cambios, sigue validándose server-side en `validate`/`preview` (los 2 puntos donde archivos crudos siguen viajando).
- `employeeMapping`, warnings aceptables/bloqueantes, backup gate, preflight, ejecución única, resultado final: sin cambios de comportamiento — todos operan hoy sobre datos ya parseados/consolidados (`previewResult`), no sobre archivos crudos, y no se tocan sus componentes (`InconsistencyStep`, `BackupStep`, `DeletionPreviewStep`, `FinalConfirmationStep`, `ValidationReportStep`, `FinalReportStep` — confirmado por inspección, ninguno hace `fetch` con `files`).

---

## Acceptance Criteria

1. **AC-1** — `partitionFilesByBudget()` (nueva, pura, `modules/migration/domain/`) particiona un arreglo de archivos por tamaño acumulado (`MAX_BATCH_BYTES`) con tope secundario de cantidad (`MAX_BATCH_FILES`), preservando el orden original, sin descartar ni fusionar archivos.
2. **AC-2** — Un archivo individual cuyo tamaño por sí solo exceda `MAX_BATCH_BYTES` viaja solo en su propio batch (no lanza error de partición, no se combina con otro).
3. **AC-3** — Con 1 archivo o pocos (bytes totales < `MAX_BATCH_BYTES`), `partitionFilesByBudget()` devuelve un único batch — cero cambio de comportamiento observable end-to-end respecto a hoy.
4. **AC-4** — `FileUploadStep.handleAnalyze()` envía los archivos seleccionados en N requests secuenciales a `/api/migracion/validate` según la partición, y consolida los N `AnalysisResultType[]` en un único arreglo, preservando el orden original de selección.
5. **AC-5** — `PreviewStep` envía los archivos recibidos en N requests secuenciales a `/api/migracion/preview` y consolida los N resultados en un único dataset — `members`, `shifts`, `warnings` concatenados; `membershipTypeDistribution` sumado por clave; `sellerNames` unión+dedup+orden alfabético global.
6. **AC-6** — La función pura de consolidación de preview detecta folios de corte duplicados en el conjunto GLOBAL ya consolidado (no por-batch) y agrega una entrada a `warnings` por cada folio repetido, con `code: "DUPLICATE_FOLIO"`.
7. **AC-7** — Ningún request multipart disparado por el wizard (en ningún paso) excede `MAX_BATCH_BYTES` de contenido de archivo.
8. **AC-8** — Contra el lote real (`docs/2026/`, 243 `.xlsx`, sin escritura DB): `/validate` procesa el lote completo mediante múltiples requests (>1, dado que 5,507,265 B > `MAX_BATCH_BYTES`) y el resultado consolidado reporta 243 archivos analizados, 0 errores de parseo.
9. **AC-9** — Contra el mismo lote real: `/preview` (batcheado) produce un dataset consolidado con 242 cortes, 1 archivo de socios → 652 socios, 0 folios duplicados, exactamente los 2 warnings ya conocidos y aceptados (más los que agregue `DUPLICATE_FOLIO` si aplicara — que en este lote real deben ser 0 adicionales).
10. **AC-10** — Contra el mismo lote real: los `sellerNames` globales consolidados por batching son IDÉNTICOS (mismo conjunto, mismo orden) a los que produciría hoy una única llamada monolítica a `previewFiles()` con los 243 archivos — sin pérdida de nombres por el particionado en batches.
11. **AC-11** — `ImportSociosStep` ya NO adjunta archivos (`files`) al request de `POST /api/migracion/sync-members` — envía los `DomainMember[]` ya consolidados (JSON, una sola request — medido 259,056 B, 16.5% de `MAX_BATCH_BYTES`, sin necesidad de staging). La ruta deja de llamar `previewFiles(files)` y pasa el JSON recibido directamente a `MigrationService.syncMembers()`, sin cambios en `syncMembers()`.
12. **AC-12** — `ImportCortesStep` ya NO adjunta archivos al request de `POST /api/migracion/sync-shifts` — el arreglo `DomainShift[]` consolidado (con `sales`/`inventory`/`withdrawals` y campos financieros completos) se particiona en sub-batches bajo `MAX_BATCH_BYTES` y se envía a `POST /api/migracion/sync-shifts/stage` (uno por sub-batch, `{importId, batchIndex, shifts}`), seguido de un único `POST /api/migracion/sync-shifts/finalize` con `{importId, employeeMapping}`.
13. **AC-13** — `ExecutionStep` sigue el mismo patrón que AC-12 para `shifts` — sub-batches a `POST /api/migracion/reconstruccion/ejecutar/stage`, luego un único `POST /api/migracion/reconstruccion/ejecutar/finalize` con `{importId, members, employeeMapping, reimportProducts}` (medido: `members`+metadata = ~259 KB, seguro en una sola request).
14. **AC-14** — `finalizeSyncMode()` (Sync) y todas las fases de `executeReconstruction()` (Reconstruction) se ejecutan EXACTAMENTE UNA VEZ por importación, con el conjunto GLOBAL completo de shifts reconstruido desde `MigrationImportStaging` — no una vez por sub-batch de staging (verificable: `syncShifts`/`finalizeSyncMode`/`executeReconstruction` solo se invocan desde los handlers `finalize`, nunca desde `stage`).
15. **AC-15** — `POST .../stage` es idempotente: reenviar el mismo `{importId, batchIndex}` sobrescribe la fila existente (mismo contenido esperado) — nunca duplica shifts en el arreglo reconstruido por `finalize`.
16. **AC-16** — `POST .../finalize` solo reconstruye/procesa filas de `MigrationImportStaging` cuyo `adminUserId` coincide con el de la sesión ADMIN activa que hace la llamada — un `importId` de otra sesión/admin no es accesible.
17. **AC-17** — Tras un `finalize` exitoso, las filas de `MigrationImportStaging` de ese `importId` se eliminan. Filas abandonadas (import nunca finalizado) se eliminan por barrido de TTL (>2 horas) en el siguiente `INSERT` de staging de cualquier importación.
18. **AC-18** — Los handlers de `finalize` (`sync-shifts`, `ejecutar`) rehidratan explícitamente a `Date` (o `null`) los campos `openingDate` (shift), `saleDate` (sale), `withdrawalDate` (withdrawal) antes de llamar a `syncShifts`/`finalizeSyncMode`/`executeReconstruction`. El handler de `sync-members` rehidrata `birthDate`/`startDate`/`endDate`/`lastVisit` antes de llamar a `syncMembers`.
19. **AC-19** — Si un batch de `/validate` o `/preview` falla (respuesta no-2xx o error de red): el wizard detiene el envío de batches restantes, no avanza de paso, muestra un error identificando el batch fallido, y ofrece un mecanismo para reintentar ÚNICAMENTE ese batch (no reinicia los batches ya exitosos, no ejecuta Sync/Reconstruction).
20. **AC-20** — Durante el envío de batches en `FileUploadStep`, `PreviewStep`, y de sub-batches de staging en `ImportCortesStep`/`ExecutionStep`, la UI muestra progreso (lote actual / total de lotes, o archivos/shifts procesados / total).
21. **AC-21** — Con un único archivo (o pocos, bajo el presupuesto de un batch): comportamiento end-to-end idéntico al actual — mismo número de requests (1), mismo resultado; con pocos shifts (bajo el presupuesto), `ImportCortesStep`/`ExecutionStep` envían un único sub-batch de `stage` seguido de `finalize` — el flujo de 2 rutas no cambia, solo se reduce a N=1.
22. **AC-22** — Ambos modos (Sync y Reconstruction) usan la misma partición/consolidación de `/validate` y `/preview`, y el mismo mecanismo de `stage`+`finalize` para transportar `shifts` (componentes/rutas compartidas o simétricas) sin duplicar lógica.
23. **AC-23** — El filtro de exclusión de `.xls`, el límite de 10 MB por archivo (server-side, en `validate`/`preview`), el gate de backup/preflight, y el flujo de `employeeMapping` (auto-mapeo + mapeo manual) permanecen sin cambio de comportamiento observable.
24. **AC-24** — Ningún test/validación de esta Story ejecuta `syncMembers`, `syncShifts`, `executeReconstruction`, ni escribe en la base de datos real (la medición de payloads y la verificación de `MigrationImportStaging` se hacen sobre datos de prueba/lectura, nunca disparando las funciones de negocio).

---

## Tasks / Subtasks

- [x] **T1** — Partición pura por bytes (AC-1, AC-2, AC-3)
  - [x] T1.1 — Crear `modules/migration/domain/upload-batching.ts`: exportar `MAX_BATCH_BYTES = 1.5 * 1024 * 1024`, `MAX_BATCH_FILES = 80`, y `partitionFilesByBudget(files: {size:number}[], opts?): number[][]` (greedy, un recorrido, preserva orden, un archivo que excede el presupuesto solo va solo en su batch).
  - [x] T1.2 — Sin imports de Prisma/HTTP/exceljs — debe ser importable desde componentes cliente (`"use client"`).

- [x] **T2** — Consolidación pura (AC-4, AC-5, AC-6, AC-10)
  - [x] T2.1 — `concatAnalysisResults(batches: AnalysisResultType[][]): AnalysisResultType[]` — concatenación preservando orden de batches y de archivos dentro de cada batch.
  - [x] T2.2 — `consolidatePreviewBatches(batches: PreviewResponseType[]): PreviewResponseType` (o el tipo enriquecido de T5 si ya existe) — implementa exactamente la lógica de Decisiones §4 (members/shifts/warnings concat, distribution merge por suma de claves, sellerNames unión+`Set`+sort, totalWarnings recalculado al final).
  - [x] T2.3 — `detectDuplicateFolios(shifts: {folio: string}[]): ParseWarningType[]` — agrupa por `folio`, para cada folio con count > 1 genera una entrada con `code: "DUPLICATE_FOLIO"`, `field: "folio"`, mensaje identificando el folio y cuántas veces aparece. Se invoca DENTRO de `consolidatePreviewBatches`, sobre el arreglo `shifts` ya concatenado (global).
  - [x] T2.4 — Ubicar en `modules/migration/domain/` (mismo archivo de T1 o uno hermano puro) — no depende de Prisma/HTTP.

- [x] **T3** — `FileUploadStep`: batching de `/validate` (AC-4, AC-7, AC-8, AC-15, AC-16, AC-17)
  - [x] T3.1 — En `handleAnalyze()` (`FileUploadStep.tsx:49-76`), reemplazar el único `fetch` por: partición vía `partitionFilesByBudget`, loop secuencial de `fetch` por batch (mismo endpoint, mismo `FormData` shape que hoy, solo con un subconjunto de archivos), acumulando resultados.
  - [x] T3.2 — Consolidar con `concatAnalysisResults` antes de `setResults`/`onAnalysisComplete`.
  - [x] T3.3 — Estado de progreso: agregar `currentBatch`/`totalBatches` (o `filesProcessed`/`totalFiles`) al estado local, mostrar junto al `Loader2` existente durante `loading`.
  - [x] T3.4 — Fallo de batch: detener el loop, `setError` identificando el batch (ej. `` `Error en lote ${i+1} de ${total}: ${msg}` ``), exponer un botón/acción que reintente solo ese batch (no reiniciar `selectedFiles` ni los batches ya completados).

- [x] **T4** — `PreviewStep`: batching de `/preview` (AC-5, AC-6, AC-7, AC-9, AC-10, AC-15, AC-16)
  - [x] T4.1 — En `fetchPreview()` (`PreviewStep.tsx:19-47`), mismo patrón que T3: partición, loop secuencial de `fetch` a `/api/migracion/preview` por batch, acumular las N respuestas.
  - [x] T4.2 — Consolidar con `consolidatePreviewBatches` antes de `setPreview`/`onPreviewComplete`.
  - [x] T4.3 — Progreso y manejo de fallo parcial: mismo patrón que T3.3/T3.4.

- [x] **T5** — Enriquecer `/api/migracion/preview` para transportar cortes sin pérdida (AC-9, AC-12, AC-13)
  - [x] T5.1 — En `types/api/migracion.ts`, extender el esquema de shift de preview (nuevo `ShiftDetailSchema` o extensión de `ShiftPreviewSchema`) para incluir, además de los campos de resumen ya existentes: `cashierName`, `sales` (arreglo con los campos de `DomainSale`, `domain.types.ts:101-114`), `inventory` (`DomainInventoryRow`, líneas 116-124), `withdrawals` (`DomainWithdrawal`, líneas 126-130), y los campos financieros directos del Cierre (`initialCash`, `ticketCount`, `membershipSales`, `productSales0Tax`, `productSales16Tax`, `subtotal`, `tax`, `totalSales`, `cashAmount`, `debitCardAmount`, `creditCardAmount`, `totalVoucher`, `totalWithdrawalsAmount`, `totalCash`), y `legacyNotes`. Fechas como ISO string (mismo patrón que `serializeMember`).
  - [x] T5.2 — En `preview/route.ts`, modificar `serializeShift()` (líneas 26-42) para incluir estos campos adicionales en vez de descartarlos — NO se toca `previewFiles()` ni `transformShift()`.
  - [x] T5.3 — `MemberPreviewSchema`/`serializeMember` no cambian — ya son 1:1 sin pérdida.
  - [x] T5.4 — Los componentes de UI que consumen `PreviewResponseType` (`PreviewStep`, `InconsistencyStep`, `FinalReportStep`) siguen leyendo únicamente los campos que ya usaban — los campos nuevos son ignorados por la UI, solo se usan como transporte hacia T9/T10/T11.

- [x] **T6** — Wizard: reemplazar `File[]` por dataset consolidado en el estado posterior a Preview (AC-11, AC-12, AC-13)
  - [x] T6.1 — En `MigracionManager.tsx`: el estado `analysisFiles: File[]` deja de pasarse a `ImportSociosStep`/`ImportCortesStep` (líneas 186, 194) — en su lugar, pasar los `members`/`shifts` ya consolidados (del `previewResult` enriquecido de T5, o un estado derivado explícito si se prefiere no sobrecargar `previewResult`).
  - [x] T6.2 — En `ReconstructionManager.tsx`: el estado `files: File[]` deja de pasarse a `ExecutionStep` (línea 102) — mismo reemplazo por datos consolidados.
  - [x] T6.3 — `analysisFiles`/`files` (`File[]`) solo se necesitan durante los Pasos 1–2 (batching de `validate`/`preview`) — pueden liberarse/dejar de usarse después de Preview; no es necesario retenerlos en memoria más allá de ese punto (limpieza, no requisito funcional estricto, pero evita retener megabytes de `File` innecesariamente en memoria del navegador durante el resto del wizard).

- [x] **T8** — Modelo de staging temporal + generalización de la partición pura (AC-12, AC-13, AC-15, AC-16, AC-17)
  - [x] T8.1 — Agregar a `prisma/schema.prisma` el modelo `MigrationImportStaging` (campos: `id`, `importId`, `adminUserId`, `kind`, `batchIndex`, `shiftsJson: Json`, `createdAt`; `@@unique([importId, batchIndex])`, `@@index([importId])`, `@@index([createdAt])`) — ver Contexto §"Mecanismo corregido" para el DDL completo. Ejecutar `npm run prisma:migrate` para generar la migración (sin aplicar a datos existentes — tabla nueva, vacía).
  - [x] T8.2 — Generalizar `partitionFilesByBudget` (T1) a `partitionByByteBudget<T>(items: T[], estimateBytes: (item: T) => number, opts): number[][]` — mismo algoritmo greedy, reutilizable tanto para `File[]` (T1, `estimateBytes = f => f.size`) como para `DomainShift[]` (`estimateBytes = s => Buffer.byteLength(JSON.stringify(s), "utf8")`). No se crean dos implementaciones separadas.
  - [x] T8.3 — Función pura `rehydrateShiftDates(shift: unknown): DomainShift` (y `rehydrateMemberDates` análoga) en `modules/migration/domain/upload-batching.ts` — convierte `openingDate`/`saleDate`/`withdrawalDate`/`birthDate`/`startDate`/`endDate`/`lastVisit` de `string | null` a `Date | null` (`field === null ? null : new Date(field)`). Usada exclusivamente en los handlers `finalize`/`sync-members`, nunca dentro de `syncMembers`/`syncShifts`/`finalizeSyncMode`/`executeReconstruction`.

- [x] **T9** — `sync-shifts`: `stage` + `finalize` en vez de una sola request con archivos (AC-12, AC-14, AC-15, AC-16, AC-17, AC-18)
  - [x] T9.1 — En `ImportCortesStep.tsx` (`handleImport()`, líneas 22-43): generar `importId` (`crypto.randomUUID()`) una vez al montar el componente; particionar `shifts` (recibidos por props, ya consolidados y enriquecidos vía T5/T6) con `partitionByByteBudget`; loop secuencial de `POST /api/migracion/sync-shifts/stage` con `{importId, batchIndex, shifts: <slice>}` por sub-batch; al terminar, un único `POST /api/migracion/sync-shifts/finalize` con `{importId, employeeMapping}`.
  - [x] T9.2 — Crear `app/api/migracion/sync-shifts/stage/route.ts`: valida sesión ADMIN activa (`requireActiveAdminApi()`), body `{importId, batchIndex, shifts}`, `prisma.migrationImportStaging.upsert({where: {importId_batchIndex: {importId, batchIndex}}, create: {..., kind: "sync-shifts", adminUserId}, update: {shiftsJson: shifts}})`. Antes del `upsert`, `prisma.migrationImportStaging.deleteMany({where: {createdAt: {lt: <ahora - 2h>}}})` (barrido de TTL, cualquier `importId`/admin).
  - [x] T9.3 — Crear `app/api/migracion/sync-shifts/finalize/route.ts`: valida sesión ADMIN activa, body `{importId, employeeMapping}`; carga `prisma.migrationImportStaging.findMany({where: {importId, adminUserId, kind: "sync-shifts"}, orderBy: {batchIndex: "asc"}})`; concatena `shiftsJson` de todas las filas en un `DomainShift[]` único; aplica `rehydrateShiftDates` a cada shift; llama `syncShifts(allShifts, employeeMapping)` + `finalizeSyncMode(allShifts, result)` UNA VEZ (sin cambios en ninguna); borra las filas de staging de ese `importId`; devuelve el mismo shape de respuesta que la ruta actual (`SyncShiftsResponseType`).
  - [x] T9.4 — El actual `app/api/migracion/sync-shifts/route.ts` (POST monolítico con `files`) se elimina — reemplazado por T9.2/T9.3. Verificar que ningún otro caller lo referencia (`grep -rn "/api/migracion/sync-shifts" --include="*.tsx" --include="*.ts"` antes de eliminar).

- [x] **T10** — `ejecutar` (Reconstruction): mismo patrón `stage`+`finalize` (AC-13, AC-14, AC-15, AC-16, AC-17, AC-18)
  - [x] T10.1 — En `ExecutionStep.tsx`: mismo patrón que T9.1 — `importId`, partición de `shifts` vía `partitionByByteBudget`, sub-batches a `.../ejecutar/stage`, luego un único `.../ejecutar/finalize` con `{importId, members, employeeMapping, reimportProducts}` (members+metadata ya medidos seguros en una sola request, no se particionan).
  - [x] T10.2 — Crear `app/api/migracion/reconstruccion/ejecutar/stage/route.ts` — igual a T9.2 con `kind: "reconstruccion-ejecutar"`.
  - [x] T10.3 — Crear `app/api/migracion/reconstruccion/ejecutar/finalize/route.ts` — igual a T9.3, pero recibe también `members`+`reimportProducts` en el body (no vienen de staging, viajan directo por ser pequeños), aplica `rehydrateMemberDates` a `members` y `rehydrateShiftDates` a los shifts reconstruidos de staging, y llama `executeReconstruction(members, allShifts, employeeMapping, reimportProducts)` UNA VEZ — sin tocar `reconstruction.service.ts`.
  - [x] T10.4 — Eliminar `app/api/migracion/reconstruccion/ejecutar/route.ts` (POST monolítico con `files`) — mismo chequeo de callers que T9.4.

- [x] **T11** — `sync-members`: aceptar datos consolidados en vez de archivos (AC-11, AC-18)
  - [x] T11.1 — En `ImportSociosStep.tsx` (`handleImport()`, líneas 21-41): reemplazar el `FormData` con `files` por un body JSON `{members}` (una sola request, sin staging — medido seguro).
  - [x] T11.2 — En `app/api/migracion/sync-members/route.ts`: cambiar el parseo de entrada de `request.formData()` + `previewFiles(files)` a `request.json()` validado contra un esquema de `DomainMember[]` (reutilizar/definir a partir de `MemberPreviewSchema`, ya 1:1). Aplicar `rehydrateMemberDates` antes de llamar. Eliminar `MAX_FILE_SIZE` de esta ruta. Llamar `MigrationService.syncMembers(members)` directamente — sin cambios en `syncMembers()`.

- [x] **T12** — Smoke tests de funciones puras (AC-1, AC-2, AC-3, AC-6, AC-10, AC-15, AC-18)
  - [x] T12.1 — Crear `scripts/migracion-batching-smoke-test.ts` (patrón `assert()` existente, sin DB): casos para `partitionByByteBudget` (lote parejo, item único que excede el presupuesto, un solo item total, lote vacío — con `File[]` y con `DomainShift[]` de fixture), `concatAnalysisResults` (preserva orden), `consolidatePreviewBatches` (merge de distribution por suma, unión+sort de sellerNames con solapamiento entre batches, warnings concatenados), `detectDuplicateFolios` (0 duplicados, 1 folio repetido 2 veces, folio repetido 3 veces), `rehydrateShiftDates`/`rehydrateMemberDates` (string ISO → `Date`, `null` → `null`, verificar `instanceof Date` tras rehidratar).
  - [x] T12.2 — Registrar `"smoke:migracion-batching": "tsx scripts/migracion-batching-smoke-test.ts"` en `package.json`.

- [x] **T13** — Prueba de integración/reproducción contra el lote real (AC-7, AC-8, AC-9, AC-10, AC-24)
  - [x] T13.1 — Reproducir localmente (`next dev`, sesión ADMIN de prueba temporal — mismo patrón que la investigación previa) una carga completa de `docs/2026/*.xlsx` (243 archivos) a través del `FileUploadStep`/`PreviewStep` YA BATCHEADOS.
  - [x] T13.2 — Instrumentar/loggear temporalmente (o inspeccionar vía DevTools Network) el tamaño de cada request multipart disparada — confirmar ninguna excede `MAX_BATCH_BYTES` (AC-7) y que se dispararon >1 requests (AC-8).
  - [x] T13.3 — Verificar el resultado consolidado final: 243 archivos analizados, 242 cortes, 1 archivo de socios, 652 socios, 0 errores de parseo, 0 folios duplicados, exactamente los 2 warnings ya conocidos (AC-9), y que los `sellerNames` consolidados coincidan con los que produce hoy `previewFiles()` con los 243 archivos en una sola llamada server-side directa (AC-10).
  - [x] T13.4 — Verificar además, con el `MigrationImportStaging` real creado por `ImportCortesStep` contra los 242 cortes reales (sin llamar `finalize`, sin `syncShifts`): que el número de sub-batches de `stage` es el esperado según la medición real (`ceil(1,896,939 / 1,572,864) = 2`), y que cada request de `stage` está por debajo de `MAX_BATCH_BYTES`.
  - [x] T13.5 — Confirmar explícitamente que NO se llamó a `finalize` en T13.4 (o que si se llamó, fue contra una base de prueba descartable) — NO se ejecutó Sync ni Reconstruction real, ninguna escritura en la base de datos de producción (AC-24).
  - [x] T13.6 — Eliminar cualquier usuario de prueba temporal y cualquier fila de `MigrationImportStaging` de prueba creada para la reproducción, igual que en la investigación previa.

- [x] **T14** — Validación general
  - [x] T14.1 — `npx tsc --noEmit`.
  - [x] T14.2 — `npm run lint` acotado a los archivos tocados.
  - [x] T14.3 — `npm run smoke:migracion-batching` (nuevo, T12).

---

## Dev Notes

### Archivos que CAMBIAN (UPDATE)

| Archivo | Cambio |
|---|---|
| `app/(dashboard)/configuracion/migracion/_components/FileUploadStep.tsx` | `handleAnalyze()`: batching de `/validate` + progreso + reintento de batch fallido |
| `app/(dashboard)/configuracion/migracion/_components/PreviewStep.tsx` | `fetchPreview()`: batching de `/preview` + progreso + reintento de batch fallido |
| `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx` | Deja de reenviar `analysisFiles` (File[]) a `ImportSociosStep`/`ImportCortesStep` — pasa datos consolidados |
| `app/(dashboard)/configuracion/migracion/_components/ReconstructionManager.tsx` | Deja de reenviar `files` (File[]) a `ExecutionStep` — pasa datos consolidados |
| `app/(dashboard)/configuracion/migracion/_components/ImportSociosStep.tsx` | Envía JSON `{members}` en vez de `FormData` con archivos (una sola request) |
| `app/(dashboard)/configuracion/migracion/_components/ImportCortesStep.tsx` | Genera `importId`; particiona `shifts` y envía sub-batches a `.../sync-shifts/stage`; luego un único `.../sync-shifts/finalize` con `{importId, employeeMapping}` |
| `app/(dashboard)/configuracion/migracion/_components/ExecutionStep.tsx` | Mismo patrón que `ImportCortesStep` contra `.../ejecutar/stage` + `.../ejecutar/finalize` con `{importId, members, employeeMapping, reimportProducts}` |
| `app/api/migracion/preview/route.ts` | `serializeShift()` incluye detalle completo (sales/inventory/withdrawals/financieros), no solo conteos |
| `app/api/migracion/sync-members/route.ts` | Recibe JSON `{members}` en vez de `FormData`; elimina `MAX_FILE_SIZE` y llamada a `previewFiles()`; rehidrata fechas antes de `syncMembers()` |
| `prisma/schema.prisma` | Nuevo modelo `MigrationImportStaging` (buffer de tránsito temporal, ver Contexto §"Mecanismo corregido") |
| `types/api/migracion.ts` | Nuevo esquema de shift enriquecido para preview/transporte interno |
| `package.json` | Nuevo script `smoke:migracion-batching` |

### Archivos NUEVOS (CREATE)

| Archivo | Contenido |
|---|---|
| `modules/migration/domain/upload-batching.ts` | `partitionByByteBudget` (genérica), `MAX_BATCH_BYTES`, `MAX_BATCH_FILES`, `concatAnalysisResults`, `consolidatePreviewBatches`, `detectDuplicateFolios`, `rehydrateShiftDates`, `rehydrateMemberDates` — todo puro |
| `app/api/migracion/sync-shifts/stage/route.ts` | Recibe un sub-batch de `shifts` + `importId`/`batchIndex`, upsert idempotente en `MigrationImportStaging` + barrido de TTL |
| `app/api/migracion/sync-shifts/finalize/route.ts` | Reconstruye `shifts` desde staging (scoped por `importId`+`adminUserId`), rehidrata fechas, llama `syncShifts`+`finalizeSyncMode` UNA VEZ, limpia staging |
| `app/api/migracion/reconstruccion/ejecutar/stage/route.ts` | Igual a `sync-shifts/stage`, `kind: "reconstruccion-ejecutar"` |
| `app/api/migracion/reconstruccion/ejecutar/finalize/route.ts` | Igual a `sync-shifts/finalize`, recibe también `members`+`reimportProducts`, llama `executeReconstruction` UNA VEZ |
| `scripts/migracion-batching-smoke-test.ts` | Smoke test puro (sin DB) de las funciones anteriores, incluyendo rehidratación de fechas |

### Archivos ELIMINADOS (DELETE)

| Archivo | Por qué |
|---|---|
| `app/api/migracion/sync-shifts/route.ts` | Reemplazado por `sync-shifts/stage` + `sync-shifts/finalize` (contrato de archivos ya no aplica) |
| `app/api/migracion/reconstruccion/ejecutar/route.ts` | Reemplazado por `ejecutar/stage` + `ejecutar/finalize` |

### Archivos que NO cambian

- `modules/migration/migration.service.ts` — `analyzeFile`, `analyzeFiles`, `previewFiles`, `syncMembers`, `syncShifts`, `finalizeSyncMode`: ninguna firma ni implementación cambia. Los endpoints cambian CÓMO obtienen sus argumentos, no las funciones mismas.
- `modules/migration/reconstruction.service.ts` (`executeReconstruction` y todas sus fases internas) — solo cambia cómo el handler de `finalize` obtiene `members`/`shifts`, no la función.
- `modules/migration/adapters/*`, `modules/migration/domain/transformers/*`, `modules/migration/domain/parsers/*` — parsers Excel intactos, fuera de alcance explícito.
- `app/api/migracion/validate/route.ts` — sigue recibiendo `files` vía `FormData`, sin cambios (los archivos crudos SÍ deben seguir viajando hasta aquí, es el único punto donde se necesitan los bytes de Excel).
- `InconsistencyStep.tsx`, `BackupStep.tsx`, `DeletionPreviewStep.tsx`, `FinalConfirmationStep.tsx`, `ValidationReportStep.tsx`, `FinalReportStep.tsx` — ninguno transporta archivos hoy, confirmado por inspección; no requieren cambios.
- `EmployeeMappingSchema`, `classifyInconsistencies`, `inconsistency-classifier.ts` — sin cambios.
- Toda la lógica de negocio de D2/D1/C1/A1/A2/B1, Epic 3, dark mode, navegación — fuera de alcance, no tocados.

### Contradicción técnica encontrada — ausencia de validación de folios duplicados

Ver Contexto §"Ausencia total de validación de folios duplicados". No existe hoy, ni en el request monolítico actual, ningún chequeo de unicidad de folio entre archivos de corte. Esta Story la introduce como función pura nueva (`detectDuplicateFolios`, T2.3) aplicada al conjunto consolidado global — no porque el batching la rompa (no la rompe, porque no existía), sino porque el AC de reproducción contra el lote real exige poder *verificar* la ausencia de duplicados, lo cual requiere que el cómputo exista en algún lugar. No se modifica `previewFiles()` ni ningún transformer para esto. Confirmado con el lote real: 0 folios duplicados entre los 242 cortes (ver medición).

### Riesgo cerrado con evidencia real — tamaño del JSON consolidado en sync-shifts/ejecutar

Ver Contexto §"Medición real de los payloads JSON propuestos". El diseño original (JSON global en una sola request para `sync-shifts`/`ejecutar`) NO sobrevivió — ambos payloads medidos (1.81 MiB y 2.06 MiB) superan `MAX_BATCH_BYTES` (1.5 MB). Reemplazado por el mecanismo `stage`+`finalize` con staging temporal (`MigrationImportStaging`). `sync-members` (0.25 MiB) sí sobrevivió como request única. Este riesgo queda cerrado — no es un residual pendiente de medir en implementación, ya se midió contra el lote real de 243 `.xlsx`.

### Riesgo nuevo, abierto — infraestructura de staging es nueva superficie operativa

Introducir `MigrationImportStaging` agrega una tabla nueva, una migración de Prisma, y 4 rutas nuevas (`stage`/`finalize` × 2 flujos) — más superficie que un simple ajuste de transporte. Es la consecuencia directa de que el destino de despliegue real (Vercel Serverless) no permite acumulación en memoria entre requests; no hay alternativa sin persistencia temporal que preserve la ejecución única de `finalizeSyncMode`/`executeReconstruction`. Ver Contexto §"Mecanismo corregido" para lifecycle/cleanup/expiración/aislamiento/retry/abandono — todos documentados explícitamente por instrucción del pedido.

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Un desarrollador intenta "arreglar" el 413 solo en `FileUploadStep`/`validate`, sin tocar `preview`/`sync-members`/`sync-shifts`/`ejecutar` | Media (es el punto más visible/citado en la investigación previa) | Alto (el 413 persiste en los otros 4 puntos) | Tabla de "5 puntos" en Contexto, explícita en AC-4 a AC-13 |
| Cambiar el contrato de `sync-shifts`/`ejecutar` termina modificando `syncShifts`/`finalizeSyncMode`/`executeReconstruction` "de paso" | Media | Alto (viola el alcance explícito de no tocar lógica de negocio) | Dev Notes lista explícitamente esas funciones como NO tocadas; AC-14 verifica ejecución única sin cambiar su firma |
| Llamar `finalizeSyncMode`/fases de `executeReconstruction` una vez por sub-batch de `stage` (reintroduciendo el bug que este diseño previene) | Baja si se sigue el diseño | Alto (gymStock/maxTicket incorrectos con datos parciales) | Contexto explica por qué es inviable; AC-14 exige que solo `finalize` (nunca `stage`) invoque esas funciones, y solo una vez |
| Un desarrollador implementa el staging como `Map` en memoria del servidor en vez de `MigrationImportStaging` (más simple, parece suficiente en `next dev`) | Media (funciona en local, falla en Vercel) | Alto (pérdida silenciosa de sub-batches en producción — el 413 "se resuelve" en local pero el batching real nunca llega a `finalize` con todos los shifts) | Contexto explica explícitamente por qué el entorno serverless real invalida esa opción; T8.1 especifica la tabla Prisma como requisito, no como alternativa |
| Filas de `MigrationImportStaging` abandonadas se acumulan sin límite si el barrido de TTL no se ejecuta con suficiente frecuencia (imports raramente abandonados en la práctica) | Baja | Bajo (filas JSON pequeñas, no es dato de negocio, no bloquea otras operaciones) | AC-17; barrido en cada `INSERT` de `stage` (T9.2/T10.2) — no depende de un cron externo que no existe hoy en el proyecto |
| Reintento de batch fallido reintenta TODO el análisis en vez de solo el batch fallido, degradando la experiencia con lotes grandes | Baja | Bajo (UX, no correctness) | AC-19 explícito; T3.4/T4.3 diseñan reintento acotado |
| Un desarrollador olvida rehidratar `Date` tras `request.json()`/lectura de staging, y `syncShifts`/`finalizeSyncMode`/`syncMembers`/`executeReconstruction` reciben strings donde esperan `Date` (`.getTime()` sobre un string falla en runtime) | Media (es un detalle fácil de omitir, no falla en compilación por `unknown`/`any` en el borde JSON) | Alto (falla en runtime durante una ejecución real de Sync/Reconstruction, no en la validación previa) | AC-18 explícito; T8.3 centraliza la rehidratación en funciones puras dedicadas, usadas en los 2 handlers de `finalize` + `sync-members`; T12.1 las cubre con smoke test |

---

## Dev Agent Record

### Debug Log References

- **Bloqueo de entorno encontrado y resuelto (no relacionado con esta Story):** el servidor `next dev` real devolvía `HTTP 500` en TODA request que tocara Prisma (incluido login). Causa: `app/generated/prisma/` tenía un binario de engine obsoleto `libquery_engine-darwin-arm64.dylib.node` (del 22 de mayo, de una máquina macOS) junto a los binarios Linux correctos (`debian-openssl-3.0.x`, `rhel-openssl-3.0.x`, generados hoy por `prisma migrate dev` de T8.1). El workaround de `next.config.ts` (`readdirSync(...).find(f => f.startsWith("libquery_engine"))`) toma el primer match alfabético — `darwin` ordena antes que `debian`/`rhel`, así que el dev server intentaba cargar el binario de macOS en Linux. **Fix aplicado:** se eliminó el binario obsoleto (`app/generated/prisma/` está en `.gitignore` — artefacto generado, no fuente). No se modificó `next.config.ts` ni ningún código de la Story — es limpieza de un artefacto de build, no un cambio de comportamiento. Esto ya estaba documentado como problema recurrente en memoria del proyecto ("Prisma Query Engine Binary Restoration Across Platforms").
- Endpoint de login vía HTTP directo (`/api/auth/sign-in/email`) seguía devolviendo `500` incluso tras el fix — se usó `auth.api.signInEmail({..., asResponse: true})` en un script Node directo (mismo proceso, mismo `lib/auth.ts`) para obtener el cookie de sesión firmado y usarlo en las requests reales de la reproducción (T13). No se investigó más a fondo esa ruta específica de auth — fuera de alcance de esta Story, no bloqueaba el trabajo real.
- **Code review:** confirmado que el fix de engine de Prisma (arriba) se mantuvo — el login HTTP directo funcionó normalmente esta vez (`401` correcto ante credenciales inválidas, no `500`), confirmando que el bloqueo de entorno anterior está resuelto de forma estable.
- **Code review — verificación de aislamiento/completitud/claim:** 2 admins de prueba temporales (`review-admin-a@sgf.local`, `review-admin-b@sgf.local`) creados vía `auth.api.signUpEmail`/`signInEmail` directo, usados para 25 verificaciones contra el servidor real (idempotencia, aislamiento cross-admin, aislamiento cross-`kind`, completitud con batch faltante, `totalBatches` inconsistente, `batchIndex` fuera de rango, claim atómico vía `updateMany` concurrente contra Postgres). Ninguna verificación invocó `syncShifts`/`finalizeSyncMode`/`executeReconstruction` — las rutas de `finalize` rechazan antes de llegar a esas funciones en todos los casos probados; el claim atómico se probó directamente sobre Prisma, sin pasar por el endpoint HTTP de `finalize`. Ambos admins de prueba, sus sesiones/cuentas, y todo staging de prueba fueron eliminados al terminar — confirmado `MigrationImportStaging.count()===0` y `Member.count()`/`Shift.count()` sin cambios (652/242) tras la verificación completa.

### File List

**Nuevos:**
- `modules/migration/domain/upload-batching.ts`
- `app/api/migracion/sync-shifts/stage/route.ts`
- `app/api/migracion/sync-shifts/finalize/route.ts`
- `app/api/migracion/reconstruccion/ejecutar/stage/route.ts`
- `app/api/migracion/reconstruccion/ejecutar/finalize/route.ts`
- `scripts/migracion-batching-smoke-test.ts`
- `prisma/migrations/20260709042942_add_migration_import_staging/migration.sql`
- `prisma/migrations/20260709051500_migration_staging_completeness_and_claim/migration.sql` (code review — unicidad compuesta con `kind`, `totalBatches`, `claimedAt`)

**Modificados (implementación inicial):**
- `types/api/migracion.ts` (esquemas `SaleDetailSchema`, `InventoryRowDetailSchema`, `WithdrawalDetailSchema`, `ShiftDetailSchema`; `PreviewResponseSchema.shifts` ahora usa `ShiftDetailSchema`)
- `app/api/migracion/preview/route.ts` (`serializeShift()` incluye detalle completo)
- `app/(dashboard)/configuracion/migracion/_components/FileUploadStep.tsx`
- `app/(dashboard)/configuracion/migracion/_components/PreviewStep.tsx`
- `app/(dashboard)/configuracion/migracion/_components/MigracionManager.tsx`
- `app/(dashboard)/configuracion/migracion/_components/ReconstructionManager.tsx`
- `app/(dashboard)/configuracion/migracion/_components/ImportSociosStep.tsx`
- `app/(dashboard)/configuracion/migracion/_components/ImportCortesStep.tsx`
- `app/(dashboard)/configuracion/migracion/_components/ExecutionStep.tsx`
- `app/api/migracion/sync-members/route.ts`
- `prisma/schema.prisma` (modelo `MigrationImportStaging`)
- `package.json` (script `smoke:migracion-batching`)

**Eliminados:**
- `app/api/migracion/sync-shifts/route.ts` (reemplazado por `stage`+`finalize`)
- `app/api/migracion/reconstruccion/ejecutar/route.ts` (reemplazado por `stage`+`finalize`)

**Modificados (code review — hallazgos 1–3, ver Senior Developer Review):**
- `prisma/schema.prisma` (`MigrationImportStaging`: `@@unique([importId, batchIndex])` → `@@unique([importId, kind, batchIndex])`; nuevos campos `totalBatches`, `claimedAt`)
- `modules/migration/domain/upload-batching.ts` (nueva función pura `validateStagingCompleteness`)
- `app/api/migracion/sync-shifts/stage/route.ts` (acepta `totalBatches`; valida rango; rechaza cross-admin `403`/cross-claim `409`; TTL excluye `claimedAt` no nulo)
- `app/api/migracion/sync-shifts/finalize/route.ts` (verifica completitud antes de ejecutar; claim atómico; unclaim en fallo; cleanup solo en éxito/fallo-manejado)
- `app/api/migracion/reconstruccion/ejecutar/stage/route.ts` (mismo fix que `sync-shifts/stage`)
- `app/api/migracion/reconstruccion/ejecutar/finalize/route.ts` (mismo fix que `sync-shifts/finalize`)
- `app/(dashboard)/configuracion/migracion/_components/ImportCortesStep.tsx` (envía `totalBatches` en cada `stage`)
- `app/(dashboard)/configuracion/migracion/_components/ExecutionStep.tsx` (envía `totalBatches` en cada `stage`)
- `scripts/migracion-batching-smoke-test.ts` (+6 casos de `validateStagingCompleteness`)

**Artefacto de build eliminado (no versionado, no relacionado con el diff de esta Story):**
- `app/generated/prisma/libquery_engine-darwin-arm64.dylib.node` (obsoleto, ver Debug Log References)

### Completion Notes

- **Todas las Tasks T1–T14 completas.** Todos los AC (AC-1 a AC-24) implementados según el diseño final documentado en la Story.
- **Medición real de sub-batches de `stage`:** el diseño estimaba `~2` sub-batches para `sync-shifts` (`ceil(1,896,939 / 1,572,864)`, cálculo sobre el tamaño total agregado). La partición greedy real, aplicada por-shift (no como un blob único), produjo **4 sub-batches** contra el lote real de 242 cortes — ambos números son consistentes con el diseño (AC-7 solo exige que ningún sub-batch exceda `MAX_BATCH_BYTES`, no un conteo exacto de batches); la diferencia es esperada porque el particionado greedy por-item no empaqueta tan ajustado como una división aritmética del total. Documentado aquí porque difiere del número mencionado en Contexto/Tasks — no es una contradicción de diseño.
- **Reproducción real contra los 243 `.xlsx` de `docs/2026/` (T13):** 37/37 verificaciones pasaron contra el servidor real (`next dev`), con sesión ADMIN de prueba temporal (creada y eliminada en esta sesión, `batching-t13@sgf.local`) — incluye: `/validate` en 4 requests reales (ninguna excede `MAX_BATCH_BYTES`), `/preview` en 4 requests reales, consolidado con 243 analizados / 242 cortes / 1 socios / 652 socios / 0 errores de parseo / 0 folios duplicados / exactamente 2 warnings conocidos, `sellerNames` batcheados idénticos al control monolítico (`previewFiles()` directo, AC-10), y staging real de `sync-shifts/stage` (4 sub-batches, todos bajo el cap) — **sin llamar `finalize` en ningún momento**. Limpieza completa: staging de prueba borrado directamente (no vía `finalize`), usuario/sesiones/cuentas de prueba eliminados. Verificado post-hoc: `Member.count()=652` y `Shift.count()=242` sin cambios respecto a antes de la reproducción — confirma cero escritura operativa.
- **Lint:** 2 errores preexistentes (`react/no-unescaped-entities`) en `PreviewStep.tsx:362` — comillas literales en JSX ya presentes en `HEAD` antes de esta Story (mismo contenido, solo desplazado de línea por el código de batching agregado arriba). No corregidos — fuera del diff de esta Story, mismo criterio ya aplicado en la revisión de B1 (tolerar hallazgos preexistentes no introducidos por la Story en curso).
- **Smoke tests:** `smoke:migracion-batching` (nuevo) 22/22 ✓. Regresión en smoke tests existentes de Migración/Reconstruction: `smoke:parsers` 78/78 ✓, `smoke:inconsistency` 33/33 ✓, `smoke:member-upsert` 24/24 ✓, `smoke:shift-sync` 31/31 ✓, `smoke:sync-finalize` 11/11 ✓, `smoke:product-reset` 9/9 ✓, `smoke:product-pricing` 7/7 ✓, `smoke:reconstruction-report` 6/6 ✓ — todos sin regresión.
- **`npx tsc --noEmit`:** sin errores.
- **Ningún test/validación de esta Story ejecutó `syncMembers`, `syncShifts`, `executeReconstruction`, ni escribió en datos operativos reales** (AC-24) — confirmado explícitamente en T13 y en este resumen.
- **Sin contradicciones técnicas nuevas** más allá de las ya documentadas en Contexto (ausencia de validación de folios duplicados, medición de payloads JSON) — ambas resueltas dentro del diseño ya aprobado, sin necesidad de reabrir arquitectura.

### Change Log

- Implementación completa del batching de transporte HTTP para el wizard de Migración: partición pura por bytes (`partitionByByteBudget`), consolidación de `/validate` y `/preview` (incluye detección global de folios duplicados), enriquecimiento de `/preview` para transportar `DomainShift` completo, transporte JSON directo para `sync-members`, y mecanismo `stage`+`finalize` con staging temporal (`MigrationImportStaging`) para `sync-shifts` y `reconstruccion/ejecutar` — preserva ejecución única de `syncShifts`/`finalizeSyncMode`/`executeReconstruction` sin modificar ninguna de esas funciones de negocio. Validado contra el lote real de 243 `.xlsx` sin ejecutar Sync ni Reconstruction real.
- **Code review (commit `39cfda3`):** 3 hallazgos High corregidos en `MigrationImportStaging` — unicidad compuesta con `kind` (evita mezclar sync-shifts/Reconstruction bajo el mismo `importId`), verificación de completitud (`totalBatches`, índices contiguos) antes de ejecutar negocio, y claim atómico (`claimedAt`) contra doble ejecución concurrente de `finalize`. Ver Senior Developer Review.

---

## Senior Developer Review (AI)

**Fecha:** 2026-07-09
**Alcance revisado:** commit `39cfda3` completo — batching de `/validate`/`/preview`, consolidación pura, staging `MigrationImportStaging`, las 4 superficies `stage`/`finalize`, rehidratación de `Date`, wiring del wizard. No se reauditó Migración completa, no se repitió la investigación del HTTP 413, no se ejecutó Sync ni Reconstruction real, no se usaron subagentes.
**Resultado:** Aprobada — 3 hallazgos High encontrados, los 3 corregidos en esta misma pasada y re-validados. 0 hallazgos abiertos.

### Hallazgos encontrados y corregidos

1. **[High] Aislamiento por tipo de operación ausente en la clave única** — `@@unique([importId, batchIndex])` no incluía `kind`. Un mismo `importId` (coincidencia entre dos flujos del mismo admin, o un bug de cliente) podía mezclar sub-batches de `sync-shifts` y `reconstruccion-ejecutar` en la misma fila, contaminando el `finalize` de uno con datos del otro. **Fix:** unicidad compuesta `@@unique([importId, kind, batchIndex])` (migración `20260709051500_migration_staging_completeness_and_claim`) + verificación de propiedad (`adminUserId`) antes de cada upsert en `stage`, rechazando con `403` si el `importId`+`batchIndex`+`kind` ya pertenece a otra sesión. **Re-validado:** stage de `sync-shifts` y `reconstruccion-ejecutar` con el mismo `importId` y mismo admin produce 2 filas separadas, cada una con su propio payload intacto (verificado contra Postgres real). Admin B no puede sobrescribir ni leer el `importId` de Admin A (`403` al intentar stage, `400` — staging vacío — al intentar finalize).
2. **[High] `finalize` no verificaba completitud de batches antes de ejecutar negocio** — `finalize` leía las filas de staging existentes y ejecutaba `syncShifts`/`finalizeSyncMode`/`executeReconstruction` directamente, sin comprobar que `rows.length` correspondiera al total de sub-batches enviados por el cliente. Un staging con batches `0,1,3` de `4` (falta el `2`, por red, bug de cliente, o un `importId` reutilizado de un intento previo abandonado) ejecutaría Sync/Reconstruction sobre un subconjunto, sin ningún error visible — exactamente el escenario CRÍTICO señalado en la revisión. **Fix:** nuevo campo `totalBatches` (declarado por el cliente en cada `stage`) + función pura `validateStagingCompleteness()` (`upload-batching.ts`) que rechaza: filas faltantes, índices discontinuos/fuera de rango, y `totalBatches` inconsistente entre sub-batches — aplicada en ambos `finalize` ANTES de tocar cualquier función de negocio. **Re-validado contra Postgres real:** staging `0,1,3` de `4` → `finalize` responde `400`, `Member.count()`/`Shift.count()` sin cambios, staging NO se borra (permite completar el batch faltante). `totalBatches` inconsistente entre sub-batches → `400`. `batchIndex >= totalBatches` → rechazado ya en `stage` (`400`), nunca llega a staging.
3. **[High] Sin protección contra doble ejecución concurrente de `finalize`** — el flujo `leer staging → ejecutar negocio → cleanup` no tenía ningún claim: dos `finalize` casi simultáneos (doble click, retry del navegador) para el mismo `importId` podían leer el mismo staging antes de que cualquiera limpiara, ejecutando `syncShifts`/`finalizeSyncMode` — o, más grave, `executeReconstruction` (DELETE + recreate) — dos veces. **Fix:** claim atómico vía un único `updateMany({where: {..., claimedAt: null}, data: {claimedAt: now}})` — Postgres ejecuta el `UPDATE` como una sola operación atómica, así que de dos llamadas concurrentes con el mismo `where`, exactamente una afecta las filas (`count === rows.length`) y la otra afecta `0`. La perdedora responde `409` sin tocar ninguna función de negocio. En fallo de negocio (excepción no esperada), el claim se libera (`claimedAt: null`) para permitir un retry legítimo sin perder los datos ya transportados; en éxito (o fallo de negocio ya manejado, `success:false`), el staging se limpia. **Re-validado:** dos `updateMany` reales concurrentes contra Postgres con el mismo `where` (mismo primitivo que usa `finalize`) — resultado `counts=[0,1]` en 100% de las corridas, la fila queda `claimed` exactamente una vez. No se invocó `syncShifts`/`executeReconstruction` en esta verificación (se probó el primitivo Prisma/Postgres directamente, no el endpoint HTTP, para no arriesgar una ejecución real).

### Verificado sin hallazgos

- **Partición (`partitionByByteBudget`):** greedy, un recorrido, preserva orden; un item que excede el presupuesto por sí solo viaja solo (no crea batch vacío, no entra en loop infinito — confirmado con smoke test y con el caso real de 94,554 B máximo observado, muy por debajo de cualquier presupuesto usado). `MAX_BATCH_FILES=80` solo actúa como cierre de batch cuando `wouldExceedCount` es cierto — para el lote real (243 archivos / 4 batches ≈ 61 archivos/batch) nunca se activó, confirmando que el driver real es bytes, no cantidad.
- **Secuencialidad y retry:** `FileUploadStep`/`PreviewStep` usan un `for` con `await` (nunca `Promise.all`). `handleRetryBatch` reintenta desde `failedBatchIndex` reusando `partialResults`/`partialResultsRef` — los batches ya exitosos no se re-envían ni se duplican en el resultado consolidado (confirmado leyendo el código: `collected = [...priorResults]`, se hace `push` solo de los batches nuevos).
- **Consolidación (`concatAnalysisResults`, `consolidatePreviewBatches`, `detectDuplicateFolios`):** cubre los 6 campos reales de `PreviewResponseType` sin pérdida; `membershipTypeDistribution` suma por clave; `sellerNames` unión+dedup+sort global; `detectDuplicateFolios` corre sobre el arreglo `shifts` YA concatenado (cross-batch, no por-batch) y agrega exactamente 1 warning por folio repetido (no una por ocurrencia). 0 duplicados reales confirmado contra los 242 cortes reales.
- **Rehidratación de fechas:** los 7 campos `Date` reales (`openingDate`, `saleDate`, `withdrawalDate`, `birthDate`, `startDate`, `endDate`, `lastVisit`) se rehidratan explícitamente; `null` se preserva; ningún otro campo `Date`/no-serializable quedó sin cubrir en `DomainMember`/`DomainShift`/`DomainSale`/`DomainInventoryRow`/`DomainWithdrawal` (confirmado contra `domain.types.ts`). Las funciones de negocio (`syncMembers`, `syncShifts`, `finalizeSyncMode`, `executeReconstruction`) siguen recibiendo `Date` real — cero lógica de JSON dentro de ellas.
- **Contratos:** `EmployeeMappingSchema` solo viaja en los `finalize` que lo necesitan; `reimportProducts` llega intacto a `executeReconstruction`; `failedPhase`/resultado se devuelven sin transformar (`Response.json(result)` directo).
- **Wizard de una sola operación:** ningún `stage` importa `MigrationService`/`reconstruction.service` — solo `finalize` puede ejecutar negocio. `MigracionManager`/`ReconstructionManager` conservan un único `onAnalysisComplete`/`onPreviewComplete`/`onComplete` por paso.
- **TTL:** 2 horas exactas (`2 * 60 * 60 * 1000`), comparación `createdAt < now - TTL` correcta, barrido corre en cada `stage` (no cron), y ahora excluye filas `claimedAt != null` (no borra una finalización en curso aunque tarde más de 2h).

### Observación no bloqueante

4. **Ventana teórica de TTL durante staging muy lento (no corregido, severidad Baja):** si un admin tardara más de 2 horas en completar la secuencia de `stage` de un mismo import (el loop es automático/secuencial dentro de una sola llamada async, normalmente segundos a minutos — no hay pausa de usuario entre sub-batches), el barrido de TTL de OTRO import podría borrar sub-batches ya subidos pero aún no `claimed` (el claim solo protege desde `finalize` en adelante). Dado que la secuencia de `stage` no depende de interacción humana entre sub-batches, este escenario es prácticamente inalcanzable en el uso real del wizard. No se agregó un campo adicional de "actividad reciente" para cubrirlo — hubiera requerido más estado por fila para un riesgo con probabilidad despreciable, desproporcionado para esta Story.

### Action Items

Ninguno — los 3 hallazgos encontrados fueron corregidos y re-validados en esta misma pasada.
