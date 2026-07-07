# Story A1: Cortes — estadísticas agregadas reales (Total/Cerrados/Abiertos)

**Status:** done
**Epic:** Corrección Post-Reconstruction — Consistencia de Datos y Métricas (iniciativa ad-hoc, fuera de la numeración de Epic 1/2/3)
**Prioridad:** Alta — corrige que `/cortes` pueda mostrar simultáneamente `242 Total Cortes` y `10 Cerrados`, una contradicción visible para cualquier admin.
**Orden en el plan aprobado:** 4 de 6 (D2 → D1 → C1 → A1 → A2 → B1). D2, D1 y C1 ya están `done`. Esta Story es independiente de A2 y B1 y no los bloquea ni los implementa.

---

## Story

Como administrador que consulta `/cortes`,
quiero que las cards "Total Cortes", "Cerrados" y "Abiertos" representen el universo completo bajo los filtros activos,
para que las cards nunca se contradigan entre sí ni cambien solo por navegar de página.

---

## Contexto del desarrollador

### Causa raíz confirmada (hecho de esta conversación, no reinvestigar)

En `app/(dashboard)/cortes/_components/cortes-manager.tsx`:

```typescript
const cortesCerrados = cortes.filter((c) => c.status === "CLOSED").length;  // línea 268
const cortesAbiertos = cortes.filter((c) => c.status === "OPEN").length;    // línea 269
```

`cortes` (línea 59: `useState<CorteResponse[]>([])`) contiene **únicamente la página actual** — `getShifts()` (`services/shifts.service.ts:385-436`) aplica `skip`/`take` con `ITEMS_POR_PAGINA=10` (línea 46 de `cortes-manager.tsx`). `totalCortes` (línea 62), en cambio, viene de `resultado.data.total` (línea 131), que sí es el conteo real (`prisma.shift.count({ where })`, línea 417 de `shifts.service.ts`).

Por eso `cortesCerrados`/`cortesAbiertos` se derivan de un array de máximo 10 elementos mientras `totalCortes` refleja el universo completo (242) — de ahí `242 Total Cortes` simultáneo con `10 Cerrados`. Cambiar de página cambia qué 10 registros están en `cortes`, y por lo tanto cambia las cards Cerrados/Abiertos sin que el universo real haya cambiado.

Confirmado en DB real: `Shift.count()=242`, `Shift.count({where:{closingDate:null}})=0` (0 abiertos, 242 cerrados).

### Filtros reales ya soportados por `getShifts()` (revisado puntualmente — no reauditar el módulo)

`GetShiftsParams` (`types/api/shifts.ts:56-66`):

```typescript
export interface GetShiftsParams {
  search?: string;      // folio, contains insensitive
  startDate?: Date;      // openingDate >= startDate
  endDate?: Date;        // openingDate <= endDate
  cashier?: string;      // cashierId exacto
  status?: string;       // "abiertos" | "cerrados" | cualquier otro valor = todos
  orderBy?: string;
  order?: string;
  page?: number;
  perPage?: number;
}
```

`getShifts()` (`services/shifts.service.ts:385-436`) construye hoy un único objeto `where` (líneas 391-412):

```typescript
const where: {
  folio?: { contains: string; mode: "insensitive" };
  openingDate?: { gte: Date; lte: Date };
  cashierId?: string;
  closingDate?: null | { not: null };
} = {};

if (params?.search) where.folio = { contains: params.search, mode: "insensitive" };
if (params?.startDate && params?.endDate) where.openingDate = { gte: params.startDate, lte: params.endDate };
if (params?.cashier) where.cashierId = params.cashier;
if (params?.status === "abiertos") where.closingDate = null;
else if (params?.status === "cerrados") where.closingDate = { not: null };

const total = await prisma.shift.count({ where });
```

`orderBy`/`order`/`page`/`perPage` no participan en ningún `where` — no son parte de `baseWhere` ni de `where`, solo afectan orden y paginación de `shifts`. No hay ningún otro filtro real soportado hoy (no hay filtro por monto, por ejemplo) — `baseWhere` = exactamente `folio` + `openingDate` + `cashierId`, sin el bloque de `status`.

### Por qué no basta con exponer `total` (ya existe) — hace falta distribución del universo base

Si `closedCount`/`openCount` se calcularan sobre el mismo `where` que ya incluye `status`, entonces al filtrar por `status=abiertos` las cards mostrarían `Cerrados=0, Abiertos=N` trivialmente (la propia condición de status fuerza el resultado) — no aportaría información real sobre la distribución subyacente. Por eso el diseño aprobado separa `baseWhere` (todo excepto `status`) de `where` (`baseWhere` + `status`), y calcula `closedCount`/`openCount` sobre `baseWhere`, no sobre `where`.

### Contrato existente (fuente de verdad — no duplicar)

`ListaCortesResponse` vive en `types/api/shifts.ts:178-184` — es una interfaz plana, **sin** Zod schema paralelo para la respuesta (no hay `ListaCortesResponseSchema`; la ruta `app/api/shifts/route.ts:64` hace `Response.json(result)` directo). Es el único contrato a extender — no crear un tipo local nuevo en el cliente ni en `cortes-manager.tsx`.

```typescript
export interface ListaCortesResponse {
  shifts: CorteResponse[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
```

`cargarCortes()` (`lib/api/shifts.client.ts:191-203`) ya retorna `{ success, data?: ListaCortesResponse, error? }` — no necesita cambios de forma, solo se beneficia de los campos nuevos en `ListaCortesResponse`.

---

## Acceptance Criteria

1. **AC-1** — Sin filtros activos: `total` refleja el conteo real (242 con la DB actual), y `closedCount + openCount === total` (242 = 242 + 0, con la DB actual).
2. **AC-2** — Cambiar de página (`page` 1→2→...) con los mismos filtros: `closedCount` y `openCount` no cambian — dejan de derivarse de `cortes` (el array paginado) y pasan a venir del `ListaCortesResponse`.
3. **AC-3** — Con `startDate`/`endDate` activos: `total`, `closedCount` y `openCount` corresponden únicamente a los `Shift` cuyo `openingDate` cae en el rango — `closedCount + openCount === total` sigue cumpliéndose dentro de ese universo filtrado por fecha (el filtro de fecha SÍ es parte de `baseWhere`).
4. **AC-4** — Con `cashier` activo: `closedCount`/`openCount` usan el mismo `cashierId` que `total` — la distribución corresponde únicamente a los turnos de ese cajero.
5. **AC-5** — Con `status="abiertos"` o `status="cerrados"` activo: `total` conserva la semántica actual (cuenta solo lo que matchea el status filtrado — sigue usando `where`, que incluye `status`). `closedCount`/`openCount` **no** se recalculan con el status aplicado — siguen representando la distribución completa de `baseWhere` (sin la condición de status), por lo que NO se vuelven triviales `0/N` solo porque el usuario seleccionó un status.
6. **AC-6** — `search` (folio) activo: `baseWhere` lo incluye — `closedCount`/`openCount` respetan la búsqueda igual que `total`.
7. **AC-7** — El contrato `ListaCortesResponse` (`types/api/shifts.ts:178`) es la única fuente de verdad extendida — no se crea ningún tipo paralelo en `lib/api/shifts.client.ts` ni en `cortes-manager.tsx`.
8. **AC-8** — `cortes-manager.tsx` consume `closedCount`/`openCount` del response (nuevo estado, ej. `useState`, poblado en el mismo punto donde hoy se puebla `totalCortes`) — se elimina por completo la derivación `cortes.filter((c) => c.status === "CLOSED").length` y su equivalente para `"OPEN"` (líneas 268-269 actuales).
9. **AC-9** — Sin regresión: paginación (`page`/`perPage`/`totalPages`), filtros existentes (`search`, fecha, cajero, status, orden) y el array `shifts` de la página actual siguen funcionando exactamente igual que hoy. El detalle de un corte individual y sus acciones (abrir/cerrar/retiros) quedan fuera de alcance — no se toca `getActiveShift()`, `closeCorte()`, ni los modales.
10. **AC-10** — `orderBy`/`order`/`page`/`perPage` no forman parte de `baseWhere` ni de `where` — solo afectan el orden/recorte de `shifts`, nunca los conteos.

---

## Tasks / Subtasks

- [x] **T1** — Contrato (AC-7)
  - [x] T1.1 — En `types/api/shifts.ts`, extender `ListaCortesResponse` (línea 178) agregando `closedCount: number;` y `openCount: number;`. No crear un tipo nuevo ni duplicar `ListaCortesResponse` en otro archivo.

- [x] **T2** — `getShifts()` — separar `baseWhere` de `where` (AC-1 a AC-6, AC-10)
  - [x] T2.1 — En `services/shifts.service.ts` (`getShifts()`, líneas 385-436), renombrar/reestructurar la construcción actual del `where` en dos objetos:
    - `baseWhere`: incluye `folio` (search), `openingDate` (fecha), `cashierId` (cajero) — **todo excepto** la rama de `status`.
    - `where`: `{ ...baseWhere }` más la rama de `status` (`closingDate: null` o `closingDate: { not: null }`) cuando `params?.status` sea `"abiertos"` o `"cerrados"`.
  - [x] T2.2 — `total` sigue calculándose con `prisma.shift.count({ where })` (semántica actual, sin cambios — AC-5 primera mitad).
  - [x] T2.3 — Agregar `closedCount = await prisma.shift.count({ where: { ...baseWhere, closingDate: { not: null } } })`.
  - [x] T2.4 — Agregar `openCount = await prisma.shift.count({ where: { ...baseWhere, closingDate: null } })`.
  - [x] T2.5 — La query `shifts` (`findMany`, líneas 419-427) sigue usando `where` (con status incluido) — no cambia, sigue paginando exactamente el mismo universo que hoy.
  - [x] T2.6 — Agregar `closedCount` y `openCount` al `return` de `getShifts()` (línea 429).
  - [x] T2.7 — Los tres counts (`total`, `closedCount`, `openCount`) pueden lanzarse en paralelo (`Promise.all`) junto con `findMany` — no es un requisito de la Story, pero si se hace, verificar que no cambia el comportamiento (AC-9).

- [x] **T3** — UI: `cortes-manager.tsx` consume el contrato (AC-2, AC-8)
  - [x] T3.1 — Agregar estado nuevo (ej. `const [cortesCerrados, setCortesCerrados] = useState(0)` y `const [cortesAbiertos, setCortesAbiertos] = useState(0)`, o un único estado agregando ambos).
  - [x] T3.2 — En `cargarDatos()` (líneas 103-143), donde hoy se hace `setTotalCortes(resultado.data.total)` (línea 131), agregar `setCortesCerrados(resultado.data.closedCount)` y `setCortesAbiertos(resultado.data.openCount)`.
  - [x] T3.3 — Eliminar las líneas 268-269 actuales (`const cortesCerrados = cortes.filter(...)`, `const cortesAbiertos = cortes.filter(...)`) — las cards (líneas ~387 y ~403) referencian ahora el estado nuevo en vez de la constante derivada.
  - [x] T3.4 — No modificar la lógica de paginación (`paginaActual`, `totalPaginas` línea 267, `ITEMS_POR_PAGINA`) ni los filtros (`FiltrosCorte`, `CortesFiltros`) — fuera de alcance (AC-9).

- [x] **T4** — Validación (AC-1 a AC-6, AC-9)
  - [x] T4.1 — Verificar manualmente (o con smoke test si el patrón del proyecto lo permite sin DB — `getShifts()` requiere Prisma, así que la verificación aquí es de lectura contra la DB real, sin escritura) que con la DB actual: `total=242`, `closedCount=242`, `openCount=0`.
  - [x] T4.2 — Verificar que cambiar `page` entre 1 y 2 (mismos filtros) no cambia `closedCount`/`openCount` en la respuesta.
  - [x] T4.3 — Verificar con `status="abiertos"`: `total` refleja solo abiertos (0 con la DB actual) pero `closedCount`/`openCount` siguen siendo 242/0 (la distribución de `baseWhere`, no de `where`).
  - [x] T4.4 — `npx tsc --noEmit` y `npm run lint` acotado a los archivos tocados.

---

## Dev Notes

### Archivos que CAMBIAN (UPDATE)

| Archivo | Cambio |
|---|---|
| `types/api/shifts.ts` | `ListaCortesResponse` (línea 178) gana `closedCount: number` y `openCount: number` |
| `services/shifts.service.ts` | `getShifts()` (líneas 385-436): separa `baseWhere`/`where`, agrega dos `prisma.shift.count()` adicionales, los incluye en el `return` |
| `app/(dashboard)/cortes/_components/cortes-manager.tsx` | Nuevo estado para `closedCount`/`openCount` poblado desde el response; elimina la derivación `cortes.filter(...)` (líneas 268-269) |

### Archivos que NO cambian

- `lib/api/shifts.client.ts` — `cargarCortes()` ya retorna `ListaCortesResponse` completo; no requiere cambios de forma, solo hereda los campos nuevos.
- `app/api/shifts/route.ts` — hace `Response.json(result)` directo sobre lo que retorna `getShifts()`; no hay Zod schema de respuesta que actualizar (`ListaCortesResponse` no tiene un `...Schema` paralelo).
- `getActiveShift()`, `closeCorte()`, `openCorte()`, modales de detalle/cierre/apertura/retiros — fuera de alcance (AC-9).
- Paginación (`ITEMS_POR_PAGINA`, `paginaActual`, `totalPaginas`) y componente `CortesFiltros` — sin cambios.

### Sobre por qué `baseWhere` excluye únicamente `status`

`orderBy`/`order`/`page`/`perPage` nunca fueron parte de ningún `where` (son parámetros de `findMany`, no de filtrado) — no hay nada que excluir ahí. El único filtro real que puede volver triviales las cards Cerrados/Abiertos es `status`, porque es el único que actúa directamente sobre `closingDate` (la misma columna que define "cerrado" vs "abierto"). Por eso `baseWhere` = `where` menos la rama de `status`, y no hace falta excluir nada más.

### Riesgo de regresión en el orden de ejecución de counts

Los tres `count()` (`total`, `closedCount`, `openCount`) son independientes entre sí y de `findMany` — pueden ejecutarse en `Promise.all` sin riesgo de condición de carrera (todas son lecturas). No es obligatorio paralelizarlos para cumplir los AC, pero si el dev decide hacerlo, no cambia la semántica.

### Contradicción técnica — ninguna encontrada

No se identificó ninguna contradicción entre el diseño aprobado (D2/D1/C1 ya cerrados, contexto post-Reconstruction) y el estado real de `getShifts()`/`ListaCortesResponse`/`cortes-manager.tsx`. Los filtros reales verificados (`search`, fecha, cajero, status) coinciden exactamente con lo asumido en el diseño aprobado — no hay filtros adicionales ocultos que `baseWhere` deba considerar.

---

## Relación con el bug post-Reconstruction

Esta Story es la cuarta (A1) de 6 en el plan aprobado de corrección post-Reconstruction (D2 → D1 → C1 → A1 → A2 → B1). A diferencia de D2/D1 (pérdida de `Product.salePrice`) y C1 (contaminación de métricas de stock por pseudo-productos), A1 no depende de datos corregidos por Reconstruction — es un bug de UI/agregación preexistente que la auditoría post-Reconstruction expuso al notar la contradicción `242 Total Cortes` / `10 Cerrados` en `/cortes`. No requiere backfill de datos (a diferencia de D1) porque no hay ningún dato incorrecto en DB — el bug es puramente de cómo se calculan `cortesCerrados`/`cortesAbiertos` en el cliente.

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Un desarrollador calcula `closedCount`/`openCount` sobre `where` (con status incluido) en vez de `baseWhere` | Media | Alto (reintroduce cards triviales `0/N` al filtrar por status) | Este documento deja explícito el diseño `baseWhere` vs `where` y por qué (ver "Por qué no basta con exponer `total`") |
| Confundir esta Story con una corrección de datos en DB | Baja si se lee el plan | Bajo | Sección "Relación con el bug post-Reconstruction" aclara que A1 no requiere backfill ni depende de D1/C1 |
| Romper paginación o filtros existentes al tocar `getShifts()` | Baja | Alto | AC-9 y AC-10 son explícitos; T2.5 aclara que `findMany` no cambia |

---

## Dev Agent Record

**Estado:** Implementación completa. Todos los AC (AC-1 a AC-10) verificados contra la DB real en solo lectura. Validaciones (smoke test nuevo, TypeScript, lint, smoke suite existente) en verde.

### File List

- `types/api/shifts.ts` (modificado) — `ListaCortesResponse` gana `closedCount: number` y `openCount: number`.
- `services/shifts.service.ts` (modificado) — `getShifts()`: separa `baseWhere` (search/fecha/cajero) de `where` (`baseWhere` + status); agrega `closedCount`/`openCount` vía `prisma.shift.count()` sobre `baseWhere`; los 4 queries (`total`, `closedCount`, `openCount`, `findMany`) corren en `Promise.all`.
- `app/(dashboard)/cortes/_components/cortes-manager.tsx` (modificado) — nuevo estado `cortesCerrados`/`cortesAbiertos` poblado desde el response; eliminada la derivación `cortes.filter((c) => c.status === "CLOSED"/"OPEN").length`.
- `scripts/shifts-aggregate-stats-smoke-test.ts` (nuevo) — smoke test que toca DB en solo lectura (documentado explícitamente por qué, a diferencia de los demás smoke tests puros del proyecto); cross-checka `getShifts()` contra `prisma.shift.count()` independiente para sin-filtros, paginación, fecha, cajero y status.
- `package.json` (modificado) — nuevo script `smoke:shifts-aggregate-stats`.

### Change Log

- Implementación de A1: `getShifts()` expone `closedCount`/`openCount` reales calculados sobre `baseWhere` (todos los filtros excepto `status`), no sobre el array paginado ni sobre `where` (que sí incluye `status`). `cortes-manager.tsx` consume estos campos en vez de derivar las cards con `.filter()` sobre la página actual.

### Completion Notes

- `baseWhere`/`where` implementados exactamente según el diseño aprobado: `baseWhere` = `folio` (search) + `openingDate` (fecha) + `cashierId` (cajero); `where` = `{...baseWhere}` + `closingDate` según `status`. `orderBy`/`order`/`page`/`perPage` nunca formaron parte de ningún `where` — sin cambios ahí (AC-10).
- `total` sigue usando `where` (semántica sin cambios). `closedCount`/`openCount` usan `baseWhere` — por diseño, **no** se recalculan con `status` aplicado, así que no se trivializan a `0/N` cuando el usuario filtra por status (AC-5).
- Los 4 queries de `getShifts()` (`total`, `closedCount`, `openCount`, `findMany` de `shifts`) corren en `Promise.all` — son lecturas independientes, sin condición de carrera (T2.7).
- `cortes-manager.tsx`: eliminadas las líneas `cortes.filter((c) => c.status === "CLOSED").length` y su equivalente `"OPEN"` — el nuevo estado se puebla en el mismo punto donde ya se poblaba `totalCortes`, dentro de `cargarDatos()`. Paginación (`ITEMS_POR_PAGINA`, `paginaActual`, `totalPaginas`) y `FiltrosCorte`/`CortesFiltros` no se tocaron (AC-9).
- Contrato: `ListaCortesResponse` (`types/api/shifts.ts:178`) es la única fuente extendida — no se creó ningún tipo paralelo en `lib/api/shifts.client.ts` ni en el componente (AC-7).
- Ninguna contradicción técnica encontrada con el diseño aprobado — los filtros reales verificados en la creación de la Story coincidieron exactamente con la implementación.

**Validación ejecutada (DB real, solo lectura, sin escrituras):**
- Sin filtros: `total=242, closedCount=242, openCount=0` (closedCount+openCount=total) — coincide con la referencia previa, sin hardcodear el valor en el código.
- Paginación (`page=1` vs `page=2`, mismos filtros): `closedCount`/`openCount` idénticos en ambas páginas.
- Filtro de fecha (enero 2026): `getShifts()` coincide exactamente con `prisma.shift.count()` independiente sobre el mismo rango (32/32/0).
- Filtro de cajero (el de más turnos, 118): `getShifts()` coincide exactamente con `prisma.shift.count()` independiente (118/118/0).
- Filtro `status=abiertos`: `total=0` (refleja el filtro), pero `closedCount=242, openCount=0` — igual a la distribución sin filtros, no trivializada.
- Filtro `status=cerrados`: `total=242`, `closedCount=242, openCount=0` — consistente.
- `npm run smoke:shifts-aggregate-stats` (nuevo) → 9/9 ✓.
- `npm run smoke:shift-sync` → 31/31 ✓, `npm run smoke:sync-finalize` → 11/11 ✓ (suite relevante existente de turnos, sin regresión).
- `npx tsc --noEmit` → sin errores.
- `npm run lint` acotado a los 4 archivos tocados (`npx eslint`) → 0 problemas.
- No se ejecutó Sync ni Reconstruction, ni se escribió en la DB real.

---

## Senior Developer Review (AI)

**Fecha:** 2026-07-06
**Resultado:** Aprobada. Sin hallazgos bloqueantes.
**Alcance revisado:** diff exacto del commit `1e66083` (`services/shifts.service.ts`, `types/api/shifts.ts`, `app/(dashboard)/cortes/_components/cortes-manager.tsx`). No se reauditó el módulo completo, no se usaron subagentes, no se escribió en DB.

### Verificado sin hallazgos

1. **`baseWhere` correcto** — conserva `folio` (search), `openingDate` (fecha), `cashierId` (cajero); excluye únicamente la rama de `status`. Confirmado línea por línea contra el diff.
2. **Asignación de where correcta** — `total` usa `where` (con status); `closedCount` usa `{...baseWhere, closingDate:{not:null}}`; `openCount` usa `{...baseWhere, closingDate:null}`. El spread de `baseWhere` no tiene la clave `closingDate` en su tipo, así que no hay sobrescritura accidental.
3. **`Promise.all` sin asignación cruzada** — el array `[total, closedCount, openCount, shifts]` en el destructuring coincide exactamente en orden con `[count(where), count(baseWhere+not null), count(baseWhere+null), findMany(where)]`. Sin swap.
4. **UI ya no deriva de la página actual** — diff confirma que `cortes.filter((c) => c.status === "CLOSED"/"OPEN").length` fue eliminado por completo; `cortesCerrados`/`cortesAbiertos` ahora son estado poblado directamente desde `resultado.data.closedCount`/`.openCount` en `cargarDatos()`, sin pasar por transformación adicional. Sin swap entre los dos setState.

### Observación no bloqueante

5. **`smoke:shifts-aggregate-stats` no habría detectado el bug ORIGINAL.** El bug original vivía enteramente en `cortes-manager.tsx` (derivación `.filter()` sobre el array paginado) — una capa de UI. El smoke test nuevo ejercita `getShifts()` (backend), no el componente React; el repo no tiene infraestructura de test de componentes (ningún smoke test existente toca JSX/React). No se trata como hallazgo porque el fix no "tapa" el bug con un test — lo elimina estructuralmente: la UI ya no tiene ninguna lógica de derivación propia que pueda volver a romperse independientemente del backend. El smoke test sí cubre exhaustivamente la superficie que ahora SÍ tiene lógica real (`getShifts()`), incluyendo el caso específico que motivó la Story (status no trivializa Cerrados/Abiertos). Riesgo residual: si un futuro cambio en `cortes-manager.tsx` reintrodujera una derivación local en vez de leer el response, ningún test lo atraparía — aceptado dado que no existe convención de testing de componentes en el proyecto.

### Action Items

Ninguno — sin hallazgos que corregir.
